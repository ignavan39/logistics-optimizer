import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { OrderService } from './order.service';
import { OrderStatus, OrderPriority } from './entities/order.entity';

// These types mirror the proto definitions
interface CreateOrderRequest {
  customer_id: string;
  origin: { lat: number; lng: number; address: string };
  destination: { lat: number; lng: number; address: string };
  priority: string;
  weight_kg: number;
  volume_m3: number;
  notes: string;
  sla_deadline_unix: number;
}

interface UpdateOrderStatusRequest {
  order_id: string;
  status: string;
  reason: string;
  updated_by: string;
}

interface GetOrderRequest { order_id: string }
interface ListOrdersRequest { customer_id: string; status: string; page: number; limit: number }
interface CancelOrderRequest { order_id: string; reason: string }

@Controller()
export class OrderGrpcController {
  private readonly logger = new Logger(OrderGrpcController.name);

  constructor(private readonly orderService: OrderService) {}

  @GrpcMethod('OrderService', 'CreateOrder')
  async createOrder(req: CreateOrderRequest) {
    try {
      const order = await this.orderService.createOrder({
        customerId: req.customer_id,
        originLat: req.origin.lat,
        originLng: req.origin.lng,
        originAddress: req.origin.address,
        destinationLat: req.destination.lat,
        destinationLng: req.destination.lng,
        destinationAddress: req.destination.address,
        priority: this.mapPriority(req.priority),
        weightKg: req.weight_kg,
        volumeM3: req.volume_m3,
        notes: req.notes,
        slaDeadline: req.sla_deadline_unix
          ? new Date(req.sla_deadline_unix * 1000)
          : undefined,
      });

      return this.toProto(order);
    } catch (err) {
      throw this.toRpcException(err);
    }
  }

  @GrpcMethod('OrderService', 'GetOrder')
  async getOrder(req: GetOrderRequest) {
    try {
      const order = await this.orderService.getOrder(req.order_id);
      return this.toProto(order);
    } catch (err) {
      throw this.toRpcException(err);
    }
  }

  @GrpcMethod('OrderService', 'ListOrders')
  async listOrders(req: ListOrdersRequest) {
    const { orders, total } = await this.orderService.listOrders(
      req.customer_id,
      req.status ? (req.status as OrderStatus) : undefined,
      req.page || 1,
      req.limit || 20,
    );

    return {
      orders: orders.map((o) => this.toProto(o)),
      total,
      page: req.page || 1,
    };
  }

  @GrpcMethod('OrderService', 'UpdateOrderStatus')
  async updateOrderStatus(req: UpdateOrderStatusRequest) {
    try {
      const order = await this.orderService.updateOrderStatus({
        orderId: req.order_id,
        status: req.status as OrderStatus,
        reason: req.reason,
        updatedBy: req.updated_by,
      });
      return this.toProto(order);
    } catch (err) {
      throw this.toRpcException(err);
    }
  }

  @GrpcMethod('OrderService', 'CancelOrder')
  async cancelOrder(req: CancelOrderRequest) {
    try {
      const order = await this.orderService.cancelOrder(req.order_id, req.reason);
      return this.toProto(order);
    } catch (err) {
      throw this.toRpcException(err);
    }
  }

  // ── Mappers ──────────────────────────────────────────────────

  private toProto(order: import('./entities/order.entity').OrderEntity) {
    return {
      id: order.id,
      customer_id: order.customerId,
      origin: { lat: order.originLat, lng: order.originLng, address: order.originAddress ?? '' },
      destination: { lat: order.destinationLat, lng: order.destinationLng, address: order.destinationAddress ?? '' },
      status: order.status.toUpperCase(),
      priority: order.priority.toUpperCase(),
      weight_kg: order.weightKg,
      volume_m3: order.volumeM3,
      notes: order.notes ?? '',
      vehicle_id: order.vehicleId ?? '',
      driver_id: order.driverId ?? '',
      route_id: order.routeId ?? '',
      sla_deadline_unix: order.slaDeadline ? Math.floor(order.slaDeadline.getTime() / 1000) : 0,
      created_at_unix: Math.floor(order.createdAt.getTime() / 1000),
      updated_at_unix: Math.floor(order.updatedAt.getTime() / 1000),
      version: order.version,
    };
  }

  private mapPriority(p: string): OrderPriority {
    const map: Record<string, OrderPriority> = {
      ORDER_PRIORITY_HIGH: OrderPriority.HIGH,
      ORDER_PRIORITY_CRITICAL: OrderPriority.CRITICAL,
    };
    return map[p] ?? OrderPriority.NORMAL;
  }

  private toRpcException(err: unknown): RpcException {
    if (err instanceof RpcException) return err;
    const message = err instanceof Error ? err.message : String(err);

    if (message.includes('not found')) {
      return new RpcException({ code: GrpcStatus.NOT_FOUND, message });
    }
    if (message.includes('transition') || message.includes('Cannot cancel')) {
      return new RpcException({ code: GrpcStatus.FAILED_PRECONDITION, message });
    }
    return new RpcException({ code: GrpcStatus.INTERNAL, message });
  }
}
