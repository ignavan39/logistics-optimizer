import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { FleetService } from './fleet.service'
import { GetAvailableVehiclesDto, AssignVehicleDto, ReleaseVehicleDto } from './dto/fleet.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { Permissions } from '../auth/decorators/permissions.decorator'

@ApiTags('fleet')
@Controller('vehicles')
export class FleetController {
  constructor(private fleetService: FleetService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @Permissions('vehicles.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get available vehicles near a location' })
  async getAvailableVehicles(
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radius_km') radiusKm?: string,
    @Query('min_capacity_kg') minCapacityKg?: string,
    @Query('min_capacity_m3') minCapacityM3?: string,
    @Query('limit') limit?: string,
  ) {
    return this.fleetService.getAvailableVehicles({
      near_point: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : undefined,
      radius_km: radiusKm ? parseFloat(radiusKm) : undefined,
      min_capacity_kg: minCapacityKg ? parseInt(minCapacityKg) : undefined,
      min_capacity_m3: minCapacityM3 ? parseFloat(minCapacityM3) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    })
  }

  @Get(':vehicleId')
  @UseGuards(JwtAuthGuard)
  @Permissions('vehicles.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vehicle by ID' })
  async getVehicle(@Param('vehicleId') vehicleId: string) {
    return this.fleetService.getVehicle(vehicleId)
  }

  @Post(':vehicleId/assign')
  @UseGuards(JwtAuthGuard)
  @Permissions('vehicles.assign')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign vehicle to order' })
  async assignVehicle(
    @Param('vehicleId') vehicleId: string,
    @Body() dto: AssignVehicleDto,
  ) {
    return this.fleetService.assignVehicle({
      ...dto,
      vehicle_id: vehicleId,
    })
  }

  @Post(':vehicleId/release')
  @UseGuards(JwtAuthGuard)
  @Permissions('vehicles.release')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Release vehicle from order' })
  async releaseVehicle(
    @Param('vehicleId') vehicleId: string,
    @Body() dto: ReleaseVehicleDto,
  ) {
    return this.fleetService.releaseVehicle({
      ...dto,
      vehicle_id: vehicleId,
    })
  }
}