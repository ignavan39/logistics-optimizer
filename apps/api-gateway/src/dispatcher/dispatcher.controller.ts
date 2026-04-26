import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { DispatcherService } from './dispatcher.service'
import { DispatchOrderDto, CancelDispatchDto } from './dto/dispatcher.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RbacGuard } from '../auth/guards/rbac.guard'
import { Permissions } from '../auth/decorators/permissions.decorator'

@ApiTags('dispatcher')
@Controller('dispatch')
export class DispatcherController {
  constructor(private dispatcherService: DispatcherService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('dispatch.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List dispatches' })
  @ApiQuery({ name: 'status', required: false, schema: { type: 'string' } })
  async listDispatches(@Query('status') status?: string) {
    return this.dispatcherService.listDispatches({ status })
  }

  @Post()
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('dispatch.execute')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dispatch order to vehicle' })
  async dispatchOrder(@Body() dto: DispatchOrderDto) {
    return this.dispatcherService.dispatchOrder(dto.order_id)
  }

  @Get(':sagaId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('dispatch.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dispatch state' })
  async getDispatchState(@Param('sagaId') sagaId: string) {
    return this.dispatcherService.getDispatchState(sagaId)
  }

  @Post(':sagaId/cancel')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('dispatch.cancel')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel dispatch' })
  async cancelDispatch(
    @Param('sagaId') sagaId: string,
    @Body() dto: CancelDispatchDto,
  ) {
    return this.dispatcherService.cancelDispatch({
      saga_id: sagaId,
      reason: dto.reason,
    })
  }
}