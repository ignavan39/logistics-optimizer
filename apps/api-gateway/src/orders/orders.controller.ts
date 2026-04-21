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
  CreateOrderDto,
  GetOrderDto,
  ListOrdersDto,
  UpdateOrderStatusDto,
  CancelOrderDto,
} from './dto/orders.dto'
import { JwtAuthGuard, CurrentUser } from '../auth/guards/jwt-auth.guard'
import { Permissions } from '../auth/decorators/permissions.decorator'
import { RequestUser } from '../auth/strategies/jwt.strategy'

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @Permissions('orders.create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new order' })
  async createOrder(@Body() dto: CreateOrderDto, @CurrentUser() user: RequestUser) {
    const orderDto = { ...dto, customer_id: dto.customer_id || user.userId }
    return this.ordersService.createOrder(orderDto)
  }

  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  @Permissions('orders.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order by ID' })
  async getOrder(@Param('orderId') orderId: string) {
    return this.ordersService.getOrder(orderId)
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Permissions('orders.read')
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
      status: status as any,
      page: page ?? 1,
      limit: limit ?? 20,
    })
  }

  @Patch(':orderId/status')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @Permissions('orders.update')
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
  @UseGuards(JwtAuthGuard)
  @Permissions('orders.cancel')
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