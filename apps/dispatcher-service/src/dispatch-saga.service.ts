import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ClientGrpc } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { firstValueFrom, timeout, catchError, throwError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

export enum SagaStatus {
  PENDING             = 'pending',
  FINDING_VEHICLE     = 'finding_vehicle',
  CALCULATING_ROUTE   = 'calculating_route',
  ASSIGNED            = 'assigned',
  FAILED              = 'failed',
  COMPENSATING        = 'compensating',
  CANCELLED           = 'cancelled',
}

export interface DispatchSaga {
  sagaId: string;
  orderId: string;
  status: SagaStatus;
  vehicleId?: string;
  routeId?: string;
  steps: SagaStep[];
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SagaStep {
  name: string
  status: 'pending' | 'completed' | 'failed' | 'compensated'
  error?: string
  executedAt?: Date
}

interface GetOrderResponse {
  order_id: string
  customer_id: string
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
  weight_kg: number
  volume_m3: number
}

interface GetVehiclesResponse {
  vehicles: Array<{ id: string }>
}

interface CalculateRouteResponse {
  route_id: string
}

interface AssignVehicleResponse {
  success: boolean
  message?: string
}

const GRPC_TIMEOUT_MS = 5_000;

/**
 * DispatchSagaService — оркестратор саги доставки.
 *
 * Saga flow (Choreography через Kafka):
 *   1. OrderCreated event → начало саги
 *   2. FindAvailableVehicle → gRPC fleet-service
 *   3. CalculateRoute → gRPC routing-service
 *   4. AssignVehicle → gRPC fleet-service (с optimistic locking)
 *   5. UpdateOrderStatus → gRPC order-service
 *   6. Emit OrderAssigned event → Kafka
 *
 * Компенсации (rollback) при ошибке:
 *   - AssignVehicle failed → ReleaseVehicle
 *   - RouteCalc failed → vehicle остаётся свободным
 *   - Order переходит в UNASSIGNED, retry через exponential backoff
 */
@Injectable()
export class DispatchSagaService {
  private readonly logger = new Logger(DispatchSagaService.name);
  private readonly sagas = new Map<string, DispatchSaga>(); // in-memory state

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @Inject('FLEET_SERVICE') private readonly fleetClient: ClientGrpc,
    @Inject('ROUTING_SERVICE') private readonly routingClient: ClientGrpc,
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientGrpc,
  ) {}

  async startDispatch(orderId: string): Promise<DispatchSaga> {
    const sagaId = uuidv4();
    const saga: DispatchSaga = {
      sagaId,
      orderId,
      status: SagaStatus.PENDING,
      steps: [],
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.sagas.set(sagaId, saga);
    await this.persistSaga(saga);

    this.logger.log(`Saga started: ${sagaId} for order ${orderId}`);

    // Execute asynchronously — don't block the caller
    setImmediate(() => this.execute(saga).catch(err =>
      this.logger.error(`Saga ${sagaId} execution error`, err)
    ));

    return saga;
  }

private async execute(saga: DispatchSaga): Promise<void> {
    try {
      const orderSvc = this.orderClient.getService<any>('OrderService')
      const order = await firstValueFrom(
        orderSvc.getOrder({ order_id: saga.orderId }).pipe(
          timeout(GRPC_TIMEOUT_MS),
        )
      ) as GetOrderResponse
      this.addStep(saga, 'get_order', 'completed')

      await this.updateSagaStatus(saga, SagaStatus.FINDING_VEHICLE)
      const fleetSvc = this.fleetClient.getService<any>('FleetService')

      const vehiclesRes = await firstValueFrom(
        fleetSvc.getAvailableVehicles({
          near_point:    { lat: order.origin.lat, lng: order.origin.lng },
          radius_km:     10,
          min_capacity_kg: order.weight_kg,
          min_capacity_m3: order.volume_m3,
          limit: 5,
        }).pipe(
          timeout(GRPC_TIMEOUT_MS),
          catchError(err => {
            this.addStep(saga, 'find_vehicle', 'failed', err.message);
            return throwError(() => err);
          })
        )
      ) as GetVehiclesResponse

      if (!vehiclesRes.vehicles?.length) {
        throw new Error('No available vehicles found');
      }

      const vehicle = vehiclesRes.vehicles[0];
      this.addStep(saga, 'find_vehicle', 'completed');
      saga.vehicleId = vehicle.id;

      await this.updateSagaStatus(saga, SagaStatus.CALCULATING_ROUTE);
      const routingSvc = this.routingClient.getService<any>('RoutingService');

      const route = await firstValueFrom(
        routingSvc.calculateRoute({
          order_id:    saga.orderId,
          vehicle_id:  vehicle.id,
          origin:      order.origin,
          destination: order.destination,
        }).pipe(
          timeout(GRPC_TIMEOUT_MS),
          catchError(err => {
            this.addStep(saga, 'calculate_route', 'failed', err.message);
            return throwError(() => err);
          })
        )
      ) as CalculateRouteResponse;

      this.addStep(saga, 'calculate_route', 'completed');
      saga.routeId = route.route_id;

      const assignRes = await firstValueFrom(
        fleetSvc.assignVehicle({
          vehicle_id:       vehicle.id,
          order_id:         saga.orderId,
          expected_version: (vehicle as any).version,
        }).pipe(timeout(GRPC_TIMEOUT_MS))
      ) as AssignVehicleResponse;

      if (!assignRes.success) {
        // Vehicle was taken by concurrent saga — compensate & retry
        this.addStep(saga, 'assign_vehicle', 'failed', assignRes.message);
        throw new Error(`Vehicle assignment failed: ${assignRes.message}`);
      }

      this.addStep(saga, 'assign_vehicle', 'completed');

      await firstValueFrom(
        orderSvc.updateOrderStatus({
          order_id:   saga.orderId,
          status:     'ORDER_STATUS_ASSIGNED',
          reason:     'Vehicle and route assigned by dispatcher',
          updated_by: 'dispatcher-service',
        }).pipe(timeout(GRPC_TIMEOUT_MS))
      );

      this.addStep(saga, 'update_order_status', 'completed');

      await this.updateSagaStatus(saga, SagaStatus.ASSIGNED);
      this.logger.log(
        `Saga completed: ${saga.sagaId} — order ${saga.orderId} → vehicle ${vehicle.id} route ${(route as CalculateRouteResponse).route_id}`
      );

    } catch (err) {
      await this.compensate(saga, err as Error);
    }
  }

  /**
   * Компенсирующие транзакции — отменяют выполненные шаги при сбое.
   */
  private async compensate(saga: DispatchSaga, error: Error): Promise<void> {
    this.logger.warn(`Compensating saga ${saga.sagaId}: ${error.message}`);
    await this.updateSagaStatus(saga, SagaStatus.COMPENSATING);

    // Release vehicle if it was assigned
    if (saga.vehicleId) {
      try {
        const fleetSvc = this.fleetClient.getService<any>('FleetService');
        await firstValueFrom(
          fleetSvc.releaseVehicle({ vehicle_id: saga.vehicleId, order_id: saga.orderId })
            .pipe(timeout(GRPC_TIMEOUT_MS))
        );
        this.addStep(saga, 'compensate_release_vehicle', 'compensated');
        this.logger.log(`Compensation: vehicle ${saga.vehicleId} released`);
      } catch (compensateErr) {
        this.logger.error(`Compensation failed for vehicle release`, compensateErr);
      }
    }

    // Schedule retry with exponential backoff
    const backoffMs = Math.min(1000 * Math.pow(2, saga.retryCount), 30_000);
    saga.retryCount++;

    if (saga.retryCount <= 5) {
      this.logger.log(`Saga ${saga.sagaId} retry ${saga.retryCount}/5 in ${backoffMs}ms`);
      setTimeout(() => {
        saga.vehicleId = undefined;
        saga.routeId = undefined;
        void this.execute(saga);
      }, backoffMs);
    } else {
      await this.updateSagaStatus(saga, SagaStatus.FAILED);
      this.logger.error(`Saga ${saga.sagaId} permanently failed after 5 retries`);
    }
  }

  private addStep(
    saga: DispatchSaga,
    name: string,
    status: SagaStep['status'],
    error?: string,
  ): void {
    saga.steps.push({ name, status, error, executedAt: new Date() });
    void this.persistSaga(saga);
  }

  private async updateSagaStatus(saga: DispatchSaga, status: SagaStatus): Promise<void> {
    saga.status = status;
    saga.updatedAt = new Date();
    await this.persistSaga(saga);
  }

  private async persistSaga(saga: DispatchSaga): Promise<void> {
    await this.ds.query(
      `INSERT INTO dispatch_sagas
         (id, order_id, status, vehicle_id, route_id, steps, retry_count, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         status     = EXCLUDED.status,
         vehicle_id = EXCLUDED.vehicle_id,
         route_id   = EXCLUDED.route_id,
         steps      = EXCLUDED.steps,
         retry_count = EXCLUDED.retry_count,
         updated_at = EXCLUDED.updated_at`,
      [
        saga.sagaId, saga.orderId, saga.status,
        saga.vehicleId ?? null, saga.routeId ?? null,
        JSON.stringify(saga.steps), saga.retryCount,
        saga.createdAt, saga.updatedAt,
      ],
    );
  }

  getSaga(sagaId: string): DispatchSaga | undefined {
    return this.sagas.get(sagaId);
  }
}
