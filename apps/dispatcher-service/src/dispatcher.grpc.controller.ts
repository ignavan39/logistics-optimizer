import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { type DispatchSagaService } from './dispatch-saga.service';

interface ListDispatchesRequest {
  status?: string;
  limit?: number;
  offset?: number;
}

@Controller()
export class DispatcherGrpcController {
  private readonly logger = new Logger(DispatcherGrpcController.name);

  constructor(private readonly sagaService: DispatchSagaService) {}

  @GrpcMethod('DispatcherService', 'ListDispatches')
  async listDispatches(data: ListDispatchesRequest) {
    try {
      const { sagas, total } = await this.sagaService.listSagas({
        status: data.status,
        limit: data.limit || 50,
        offset: data.offset || 0,
      });

      return {
        sagas: sagas.map(this.toSagaResponse),
        total,
      };
    } catch (e) {
      this.logger.error(`ListDispatches failed: ${e}`);
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: String(e),
      });
    }
  }

  private toSagaResponse(saga: any) {
    return {
      sagaId: saga.id,
      orderId: saga.order_id,
      status: this.mapStatus(saga.status),
      steps: saga.steps || [],
      vehicleId: saga.vehicle_id || '',
      routeId: saga.route_id || '',
      retryCount: saga.retry_count || 0,
      createdAtUnix: saga.created_at ? new Date(saga.created_at).getTime() : 0,
      updatedAtUnix: saga.updated_at ? new Date(saga.updated_at).getTime() : 0,
    };
  }

  private mapStatus(status: string): number {
    const map: Record<string, number> = {
      PENDING: 1,
      FINDING_VEHICLE: 2,
      CALCULATING_ROUTE: 3,
      ASSIGNED: 4,
      FAILED: 5,
      COMPENSATING: 6,
      CANCELLED: 7,
    };
    return map[status] || 0;
  }
}