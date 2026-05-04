import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { TrackingService } from './tracking.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RbacGuard } from '../auth/guards/rbac.guard'
import { Permissions as PermissionDecorator } from '../auth/decorators/permissions.decorator'
import { Permissions } from '../auth/permissions/permissions'

@ApiTags('tracking')
@Controller('tracking')
export class TrackingController {
  constructor(private trackingService: TrackingService) {}

  @Get(':vehicleId/position')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @PermissionDecorator(Permissions.TRACKING_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get latest vehicle position' })
  async getLatestPosition(@Param('vehicleId') vehicleId: string) {
    return this.trackingService.getLatestPosition(vehicleId)
  }

  @Get(':vehicleId/history')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @PermissionDecorator(Permissions.TRACKING_READ)
  @ApiBearerAuth()
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