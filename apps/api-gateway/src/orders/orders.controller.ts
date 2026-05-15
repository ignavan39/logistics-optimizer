import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { OrdersService } from './orders.service'
import {
  type CreateOrderDto,
  type UpdateOrderStatusDto,
  type CancelOrderDto,
} from './dto/orders.dto'
import { JwtAuthGuard, CurrentUser } from '../auth/guards/jwt-auth.guard'
import { Public } from '../auth/decorators/public.decorator'
import { RbacGuard } from '../auth/guards/rbac.guard'
import { Permissions as PermissionDecorator } from '../auth/decorators/permissions.decorator'
import { AuditLog as AuditDecorator } from '../auth/decorators/audit.decorator'
import { Permissions } from '../auth/permissions/permissions'
import { RequestUser } from '../auth/strategies/jwt.strategy'

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Public()
  @Get('statuses')
  getStatuses() {
    return this.ordersService.getStatuses()
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RbacGuard)
  @PermissionDecorator(Permissions.ORDERS_CREATE)
  @AuditDecorator('order.created', 'order')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new order' })
  async createOrder(@Body() dto: CreateOrderDto, @CurrentUser() user: RequestUser) {
    const orderDto = { ...dto, customer_id: dto.customer_id || user.userId }
    return this.ordersService.createOrder(orderDto)
  }

  @Get(':orderId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @PermissionDecorator(Permissions.ORDERS_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID' })
  async getOrder(@Param('orderId') orderId: string) {
    return this.ordersService.getOrder(orderId)
  }

  @Get(':orderId/history')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @PermissionDecorator(Permissions.ORDERS_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order status history' })
  async getOrderHistory(@Param('orderId') orderId: string) {
    return this.ordersService.getOrderHistory(orderId)
  }

  @Get()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @PermissionDecorator(Permissions.ORDERS_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List orders with pagination' })
  async listOrders(
    @CurrentUser() user: RequestUser,
    @Query('customer_id') customerId?: string,
    @Query('status') status?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.listOrders({
      customer_id: customerId || user.userId,
      status: status !== undefined ? Number(status) : undefined,
      page: page ?? 1,
      limit: limit ?? 20,
    })
  }

  @Patch(':orderId/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RbacGuard)
  @PermissionDecorator(Permissions.ORDERS_UPDATE)
  @AuditDecorator('order.status.changed', 'order')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update order status' })
  async updateOrderStatus(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus({
      ...dto,
      order_id: orderId,
    })
  }

  @Delete(':orderId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RbacGuard)
  @PermissionDecorator(Permissions.ORDERS_CANCEL)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel order' })
  async cancelOrder(
    @Param('orderId') orderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.ordersService.cancelOrder({
      ...dto,
      order_id: orderId,
    })
  }
}