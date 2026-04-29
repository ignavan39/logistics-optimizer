import { Injectable, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientGrpc } from '@nestjs/microservices'
import { Inject } from '@nestjs/common'
import {
  type CreateOrderDto,
  type GetOrderDto,
  type ListOrdersDto,
  type UpdateOrderStatusDto,
  type CancelOrderDto,
} from './dto/orders.dto'

interface OrderGrpcClient {
  createOrder(data: CreateOrderDto): Promise<any>
  getOrder(data: GetOrderDto): Promise<any>
  getOrderHistory(data: GetOrderDto): Promise<any>
  listOrders(data: ListOrdersDto): Promise<any>
  updateOrderStatus(data: UpdateOrderStatusDto): Promise<any>
  cancelOrder(data: CancelOrderDto): Promise<any>
}

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private orderClient!: OrderGrpcClient

  constructor(
    @Inject('ORDERS_PACKAGE') private client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.orderClient = this.client.getService<OrderGrpcClient>('OrderService')
  }

  onModuleDestroy() {}

  async createOrder(dto: CreateOrderDto) {
    return this.orderClient.createOrder(dto)
  }

  async getOrder(orderId: string) {
    return this.orderClient.getOrder({ order_id: orderId })
  }

  async getOrderHistory(orderId: string) {
    return this.orderClient.getOrderHistory({ order_id: orderId })
  }

  async listOrders(dto: ListOrdersDto) {
    return this.orderClient.listOrders({
      customer_id: dto.customer_id,
      status: dto.status,
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    })
  }

  async updateOrderStatus(dto: UpdateOrderStatusDto) {
    return this.orderClient.updateOrderStatus({
      order_id: dto.order_id,
      status: dto.status,
      reason: dto.reason,
      updated_by: 'api-gateway',
    })
  }

  async cancelOrder(dto: CancelOrderDto) {
    return this.orderClient.cancelOrder({
      order_id: dto.order_id,
      reason: dto.reason,
    })
  }
}