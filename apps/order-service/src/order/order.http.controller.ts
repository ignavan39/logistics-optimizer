import { Controller, Get, Post, Body, Param, Query, Patch, Delete, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderHttpController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() dto: any) {
    const order = await this.orderService.createOrder({
      customerId: dto.customerId,
      originLat: dto.originLat,
      originLng: dto.originLng,
      originAddress: dto.originAddress,
      destinationLat: dto.destinationLat,
      destinationLng: dto.destinationLng,
      destinationAddress: dto.destinationAddress,
      weightKg: dto.weightKg,
      volumeM3: dto.volumeM3,
      notes: dto.notes,
      slaDeadline: dto.slaDeadline ? new Date(dto.slaDeadline) : undefined,
    });
    return this.toResponse(order);
  }

  @Get(':id')
  async getOrder(@Param('id') id: string) {
    const order = await this.orderService.getOrder(id);
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return this.toResponse(order);
  }

  @Get()
  async listOrders(
    @Query('customerId') customerId: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const result = await this.orderService.listOrders(
      customerId,
      status as any,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
    return { orders: result.orders.map(this.toResponse), total: result.total, page: parseInt(page, 10), limit: parseInt(limit, 10) };
  }

  @Patch(':id/status')
  async updateOrderStatus(@Param('id') id: string, @Body() dto: any) {
    const order = await this.orderService.updateOrderStatus({
      orderId: id,
      status: dto.status,
      reason: dto.reason,
      updatedBy: dto.updatedBy,
    });
    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return this.toResponse(order);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelOrder(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.orderService.cancelOrder(id, reason || 'cancelled');
  }

  private toResponse(order: any) {
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
      slaDeadline: order.slaDeadline?.toISOString(),
      createdAt: order.createdAt?.toISOString(),
      updatedAt: order.updatedAt?.toISOString(),
    };
  }
}