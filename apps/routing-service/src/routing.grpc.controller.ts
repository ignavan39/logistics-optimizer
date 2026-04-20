import { Controller, Logger } from '@nestjs/common'
import { GrpcMethod, RpcException } from '@nestjs/microservices'
import { status as GrpcStatus } from '@grpc/grpc-js'
import { v4 as uuidv4 } from 'uuid'

interface CalculateRouteRequest {
  order_id: string
  vehicle_id: string
  origin: { lat: number; lng: number }
  destination: { lat: number; lng: number }
}

interface CalculateRouteResponse {
  route_id: string
  distance_meters: number
  duration_seconds: number
  waypoints: Array<{ lat: number; lng: number }>
}

interface GetRouteRequest {
  route_id: string
}

interface GetRouteResponse {
  route: {
    id: string
    order_id: string
    vehicle_id: string
    distance_meters: number
    duration_seconds: number
    status: string
  }
}

@Controller()
export class RoutingGrpcController {
  private readonly logger = new Logger(RoutingGrpcController.name)
  private readonly routes = new Map<string, any>()

  @GrpcMethod('RoutingService', 'CalculateRoute')
  async calculateRoute(
    request: CalculateRouteRequest,
  ): Promise<CalculateRouteResponse> {
    const routeId = uuidv4()

    const distance = this.calculateDistance(
      request.origin.lat,
      request.origin.lng,
      request.destination.lat,
      request.destination.lng,
    )

    const duration = Math.round(distance / 15)

    const route = {
      id: routeId,
      order_id: request.order_id,
      vehicle_id: request.vehicle_id,
      origin: request.origin,
      destination: request.destination,
      distance_meters: distance,
      duration_seconds: duration,
      status: 'ROUTE_STATUS_CALCULATED',
      created_at: Date.now(),
    }

    this.routes.set(routeId, route)

    return {
      route_id: routeId,
      distance_meters: distance,
      duration_seconds: duration,
      waypoints: [request.origin, request.destination],
    }
  }

  @GrpcMethod('RoutingService', 'GetRoute')
  async getRoute(request: GetRouteRequest): Promise<GetRouteResponse> {
    const route = this.routes.get(request.route_id)
    if (!route) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Route ${request.route_id} not found`,
      })
    }
    return { route }
  }

  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000
    const dLat = this.toRad(lat2 - lat1)
    const dLng = this.toRad(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c)
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180)
  }
}