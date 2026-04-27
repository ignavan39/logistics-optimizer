import { Controller, Get, Post, Body, Param, Query, Patch, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { type OrderService, type CreateOrderDto, type UpdateOrderStatusDto } from './order.service';
import { type OrderEntity } from './entities/order.entity';

interface OrderResponseDto {
  orderId: string;
  customerId: string;
  status: string;
  priority: string;
  origin: { lat: number; lng: number; address?: string };
  destination: { lat: number; lng: number; address?: string };
  weightKg: number;
  volumeM3: number;
  notes?: string;
  slaDeadline?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Controller('orders')
export class OrderHttpController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() dto: CreateOrderDto) {
    const order = await this.orderService.createOrder(dto);
    return this.toResponse(order);
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    const order = await this.orderService.getOrder(id);
    return this.toResponse(order);
  }

  @Get(':id/history')
  async getOrderHistory(@Param('id') id: string) {
    await this.orderService.getOrder(id);
    const history = await this.orderService.getOrderHistory(id);
    return { history };
  }

  @Get()
  async listOrders(
    @Query('customerId') customerId: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const result = await this.orderService.listOrders(customerId, undefined, parseInt(page, 10), parseInt(limit, 10));
    return { orders: result.orders.map((o: OrderEntity) => this.toResponse(o)), total: result.total, page: parseInt(page, 10), limit: parseInt(limit, 10) };
  }

  @Patch(':id/status')
  async updateOrderStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    const order = await this.orderService.updateOrderStatus({
      orderId: id,
      status: dto.status,
      reason: dto.reason,
      updatedBy: dto.updatedBy,
    });
    return this.toResponse(order);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelOrder(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.orderService.cancelOrder(id, reason || 'cancelled');
  }

  private toResponse(order: OrderEntity): OrderResponseDto {
    return {
      orderId: order.id,
      customerId: order.customerId,
      status: order.status,
      priority: order.priority,
      origin: { lat: order.originLat, lng: order.originLng, address: order.originAddress },
      destination: { lat: order.destinationLat, lng: order.destinationLng, address: order.destinationAddress },
      weightKg: order.weightKg,
      volumeM3: order.volumeM3,
      notes: order.notes,
      slaDeadline: order.slaDeadline ? order.slaDeadline.toISOString() : undefined,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }
}