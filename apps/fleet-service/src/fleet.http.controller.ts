import { Controller, Get, Post, Body, Param, Delete, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { FleetService } from './fleet.service';

@Controller('fleet')
export class FleetHttpController {
  constructor(private readonly fleetService: FleetService) {}

  @Get('vehicles')
  async getAvailableVehicles(@Body() body: { nearPoint?: { lat: number; lng: number }; radiusM?: number }) {
    return this.fleetService.getAvailableVehicles(body.nearPoint, body.radiusM || 5000);
  }

  @Get('vehicles/:id')
  async getVehicle(@Param('id') id: string) {
    const vehicle = await this.fleetService.getVehicle(id);
    if (!vehicle) throw new NotFoundException(`Vehicle ${id} not found`);
    return vehicle;
  }

  @Post('vehicles/:id/assign')
  async assignVehicle(@Param('id') id: string, @Body() body: { driverId: string; orderId: string }) {
    return this.fleetService.assignVehicle(id, body.driverId, body.orderId);
  }

  @Delete('vehicles/:id/release')
  @HttpCode(HttpStatus.NO_CONTENT)
  async releaseVehicle(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.fleetService.releaseVehicle(id, reason);
  }
}