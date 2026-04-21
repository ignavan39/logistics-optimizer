import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { DispatcherService } from './dispatcher.service'
import { DispatchOrderDto, CancelDispatchDto } from './dto/dispatcher.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Permissions } from '../auth/decorators/permissions.decorator'

@ApiTags('dispatcher')
@Controller('dispatch')
export class DispatcherController {
  constructor(private dispatcherService: DispatcherService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Permissions('dispatch.execute')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dispatch order to vehicle' })
  async dispatchOrder(@Body() dto: DispatchOrderDto) {
    return this.dispatcherService.dispatchOrder(dto.order_id)
  }

  @Get(':sagaId')
  @UseGuards(JwtAuthGuard)
  @Permissions('dispatch.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get dispatch state' })
  async getDispatchState(@Param('sagaId') sagaId: string) {
    return this.dispatcherService.getDispatchState(sagaId)
  }

  @Post(':sagaId/cancel')
  @UseGuards(JwtAuthGuard)
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