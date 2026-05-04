import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { RoutingService } from './routing.service'
import { CalculateRouteDto } from './dto/routing.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RbacGuard } from '../auth/guards/rbac.guard'
import { Permissions as PermissionDecorator } from '../auth/decorators/permissions.decorator'
import { Permissions } from '../auth/permissions/permissions'

@ApiTags('routing')
@Controller('routes')
export class RoutingController {
  constructor(private routingService: RoutingService) {}

  @Post('calculate')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @PermissionDecorator(Permissions.ROUTES_CALCULATE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Calculate route between two points' })
  async calculateRoute(@Body() dto: CalculateRouteDto) {
    return this.routingService.calculateRoute(dto)
  }

  @Get(':routeId')
  @UseGuards(JwtAuthGuard, RbacGuard)
  @PermissionDecorator(Permissions.ROUTES_READ)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get route by ID' })
  async getRoute(@Param('routeId') routeId: string) {
    return this.routingService.getRoute(routeId)
  }
}