import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common'
import { v4 as uuidv4 } from 'uuid'
import { RouteCacheService } from './routing/route-cache.service'

export interface Route {
  id: string
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
  waypoints: { lat: number; lng: number }[]
  distanceMeters: number
  durationSeconds: number
  status: string
  orderId?: string
  vehicleId?: string
}

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name)
  private readonly routes = new Map<string, Route>()

  constructor(
    @Inject(forwardRef(() => RouteCacheService))
    private readonly routeCache: RouteCacheService,
  ) {}

  async calculateRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
    waypoints?: { lat: number; lng: number }[],
    vehicleId?: string,
  ): Promise<Route> {
    const cached = await this.routeCache.getRoute(originLat, originLng, destLat, destLng, vehicleId)
    if (cached) {
      this.logger.debug(`Cache hit for ${originLat},${originLng} -> ${destLat},${destLng}`)
      return cached
    }

    const routeId = uuidv4()
    const distance = this.calculateDistance(originLat, originLng, destLat, destLng)
    const duration = Math.round(distance / 15)

    const route: Route = {
      id: routeId,
      origin: { lat: originLat, lng: originLng },
      destination: { lat: destLat, lng: destLng },
      waypoints: waypoints || [],
      distanceMeters: distance,
      durationSeconds: duration,
      status: 'ROUTE_STATUS_CALCULATED',
      vehicleId,
    }

    this.routes.set(routeId, route)

    await this.routeCache.setRoute(route, originLat, originLng, destLat, destLng, vehicleId)

    return route
  }

  getRoute(routeId: string): Route | undefined {
    return this.routes.get(routeId)
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000
    const dLat = this.toRad(lat2 - lat1)
    const dLng = this.toRad(lng2 - lng1)
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c)
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180)
  }
}