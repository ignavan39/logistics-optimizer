import { Controller, Post, Body, Param, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { RoutingService } from './routing.service';

@Controller('routing')
export class RoutingHttpController {
  constructor(private readonly routingService: RoutingService) {}

  @Post('calculate')
  async calculateRoute(@Body() body: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    waypoints?: { lat: number; lng: number }[];
    vehicleId?: string;
  }) {
    return this.routingService.calculateRoute(
      body.origin.lat,
      body.origin.lng,
      body.destination.lat,
      body.destination.lng,
      body.waypoints,
      body.vehicleId,
    );
  }

  @Get(':routeId')
  async getRoute(@Param('routeId') routeId: string) {
    return this.routingService.getRoute(routeId);
  }
}