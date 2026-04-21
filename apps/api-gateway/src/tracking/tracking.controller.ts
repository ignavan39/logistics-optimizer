import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { TrackingService } from './tracking.service'
import { Public } from '../auth/decorators/public.decorator'

@ApiTags('tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private trackingService: TrackingService) {}

  @Public()
  @Get(':vehicleId/position')
  @ApiOperation({ summary: 'Get latest vehicle position' })
  async getLatestPosition(@Param('vehicleId') vehicleId: string) {
    return this.trackingService.getLatestPosition(vehicleId)
  }

  @Public()
  @Get(':vehicleId/history')
  @ApiOperation({ summary: 'Get vehicle position history' })
  async getTrack(
    @Param('vehicleId') vehicleId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('max_points') maxPoints?: string,
  ) {
    return this.trackingService.getTrack({
      vehicle_id: vehicleId,
      from_unix: from ? parseInt(from) : undefined,
      to_unix: to ? parseInt(to) : undefined,
      max_points: maxPoints ? parseInt(maxPoints) : undefined,
    })
  }
}