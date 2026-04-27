import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { type RoutingService } from './routing.service'
import { type CalculateRouteDto } from './dto/routing.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RbacGuard } from '../auth/guards/rbac.guard'
import { Permissions } from '../auth/decorators/permissions.decorator'

@ApiTags('routing')
@Controller('routes')
export class RoutingController {
  constructor(private routingService: RoutingService) {}

  @Post('calculate')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('routes.calculate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate route between two points' })
  async calculateRoute(@Body() dto: CalculateRouteDto) {
    return this.routingService.calculateRoute(dto)
  }

  @Get(':routeId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Permissions('routes.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get route by ID' })
  async getRoute(@Param('routeId') routeId: string) {
    return this.routingService.getRoute(routeId)
  }
}