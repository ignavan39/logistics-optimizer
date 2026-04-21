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
import { Public } from '../auth/decorators/public.decorator'
import { RequestUser } from '../auth/strategies/jwt.strategy'

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new order' })
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto)
  }

  @Public()
  @Get(':orderId')
  @ApiOperation({ summary: 'Get order by ID' })
  async getOrder(@Param('orderId') orderId: string) {
    return this.ordersService.getOrder(orderId)
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'List orders with pagination' })
  async listOrders(
    @Query('customer_id') customerId?: string,
    @Query('status') status?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.listOrders({
      customer_id: customerId,
      status: status as any,
      page: page ?? 1,
      limit: limit ?? 20,
    })
  }

  @Public()
  @Patch(':orderId/status')
  @HttpCode(HttpStatus.OK)
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

  @Public()
  @Delete(':orderId')
  @HttpCode(HttpStatus.OK)
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