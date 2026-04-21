import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { RoutingService } from './routing.service'
import { CalculateRouteDto } from './dto/routing.dto'
import { Public } from '../auth/decorators/public.decorator'

@ApiTags('routing')
@Controller('routes')
export class RoutingController {
  constructor(private routingService: RoutingService) {}

  @Public()
  @Post('calculate')
  @ApiOperation({ summary: 'Calculate route between two points' })
  async calculateRoute(@Body() dto: CalculateRouteDto) {
    return this.routingService.calculateRoute(dto)
  }

  @Public()
  @Get(':routeId')
  @ApiOperation({ summary: 'Get route by ID' })
  async getRoute(@Param('routeId') routeId: string) {
    return this.routingService.getRoute(routeId)
  }
}