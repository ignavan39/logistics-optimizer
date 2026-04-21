import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { DispatcherService } from './dispatcher.service'
import { DispatchOrderDto, CancelDispatchDto } from './dto/dispatcher.dto'
import { Public } from '../auth/decorators/public.decorator'

@ApiTags('dispatcher')
@Controller('dispatch')
export class DispatcherController {
  constructor(private dispatcherService: DispatcherService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Dispatch order to vehicle' })
  async dispatchOrder(@Body() dto: DispatchOrderDto) {
    return this.dispatcherService.dispatchOrder(dto.order_id)
  }

  @Public()
  @Get(':sagaId')
  @ApiOperation({ summary: 'Get dispatch state' })
  async getDispatchState(@Param('sagaId') sagaId: string) {
    return this.dispatcherService.getDispatchState(sagaId)
  }

  @Public()
  @Post(':sagaId/cancel')
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