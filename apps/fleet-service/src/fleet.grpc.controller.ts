import type { Logger } from '@nestjs/common'
import { Logger as NestLogger, Controller } from '@nestjs/common'
import { GrpcMethod, RpcException as RpcExceptionOrig } from '@nestjs/microservices'
import { status as GrpcStatus } from '@grpc/grpc-js'
import { FleetService } from './fleet.service'

interface GetAvailableVehiclesRequest {
  near_point?: { lat: number; lng: number }
  radius_km: number
  min_capacity_kg: number
  min_capacity_m3: number
  limit: number
}

interface GetAvailableVehiclesResponse {
  vehicles: Array<{
    id: string
    type: string
    capacity_kg: number
    capacity_m3: number
    status: string
    version: number
    current_location: { lat: number; lng: number } | null
    last_update: number
  }>
}

interface GetVehicleRequest {
  vehicleId: string
  vehicle_id?: string
}

interface GetVehicleResponse {
  vehicle: {
    id: string
    type: string
    capacity_kg: number
    capacity_m3: number
    status: string
    version: number
  } | null
}

interface DriverDetails {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
}

interface OrderDetails {
  id: string
  status: string
  priority: string
  pickup_address: string
  delivery_address: string
  created_at: number
}

interface VehicleDetails {
  id: string
  type: string
  capacity_kg: number
  capacity_m3: number
  status: string
  current_lat: number
  current_lng: number
  current_driver_id: string
  current_order_id: string
  last_update: number
  version: number
  created_at: number
  driver: DriverDetails | null
  order: OrderDetails | null
}

interface GetVehicleDetailsResponse {
  vehicle: VehicleDetails | null
}

interface AssignVehicleRequest {
  vehicle_id: string
  order_id: string
  expected_version: number
}

interface AssignVehicleResponse {
  success: boolean
  message?: string
}

interface ReleaseVehicleRequest {
  vehicle_id: string
  order_id: string
}

interface ReleaseVehicleResponse {
  success: boolean
}

interface UpdateVehicleRequest {
  vehicle_id: string
  type?: string
  capacity_kg?: number
  capacity_m3?: number
  current_lat?: number
  current_lng?: number
  expected_version?: number
}

interface UpdateVehicleResponse {
  success: boolean
  message?: string
  vehicle: VehicleDetails | null
}

@Controller()
export class FleetGrpcController {
  private readonly logger: Logger

  constructor(private readonly fleetService: FleetService) {
    this.logger = new NestLogger(FleetGrpcController.name)
  }

  @GrpcMethod('FleetService', 'GetAvailableVehicles')
  async getAvailableVehicles(
    request: GetAvailableVehiclesRequest,
  ): Promise<GetAvailableVehiclesResponse> {
    const nearPoint = request.near_point
      ? { lat: request.near_point.lat, lng: request.near_point.lng }
      : undefined

    const vehicles = await this.fleetService.getAvailableVehicles(
      nearPoint,
      request.radius_km * 1000,
    )

    return {
      vehicles: vehicles.slice(0, request.limit || 10).map((v) => ({
        id: v.id,
        type: v.type,
        capacity_kg: v.capacityKg,
        capacity_m3: Number(v.capacityM3),
        status: v.status,
        version: v.version,
        current_location: v.current_lat && v.current_lng
          ? { lat: v.current_lat, lng: v.current_lng }
          : null,
        last_update: v.lastUpdate ? new Date(v.lastUpdate).getTime() : Date.now(),
      })),
    }
  }

  @GrpcMethod('FleetService', 'GetVehicle')
  async getVehicle(request: GetVehicleRequest): Promise<GetVehicleResponse> {
    const vehicleId = request.vehicleId || request.vehicle_id || ''
    const vehicle = await this.fleetService.getVehicle(vehicleId)
    if (!vehicle) {
      throw new RpcExceptionOrig({
        code: GrpcStatus.NOT_FOUND,
        message: `Vehicle ${vehicleId} not found`,
      })
    }
    return {
      vehicle: {
        id: vehicle.id,
        type: vehicle.type,
        capacity_kg: vehicle.capacityKg,
        capacity_m3: Number(vehicle.capacityM3),
        status: vehicle.status,
        version: vehicle.version,
      },
    }
  }

  @GrpcMethod('FleetService', 'GetVehicleDetails')
  async getVehicleDetails(
    request: GetVehicleRequest,
  ): Promise<GetVehicleDetailsResponse> {
    const vehicleId = request.vehicleId || request.vehicle_id || ''
    const result = await this.fleetService.getVehicleDetails(vehicleId)
    if (!result.vehicle) {
      throw new RpcExceptionOrig({
        code: GrpcStatus.NOT_FOUND,
        message: `Vehicle ${vehicleId} not found`,
      })
    }
    const v = result.vehicle
    return {
      vehicle: {
        id: v.id,
        type: v.type,
        capacity_kg: v.capacityKg,
        capacity_m3: Number(v.capacityM3),
        status: v.status,
        current_lat: v.currentLat || 0,
        current_lng: v.currentLng || 0,
        current_driver_id: v.currentDriverId || '',
        current_order_id: v.currentOrderId || '',
        last_update: v.lastUpdate.getTime(),
        version: v.version,
        created_at: v.createdAt.getTime(),
        driver: v.driver ? {
          id: v.driver.id,
          email: v.driver.email,
          first_name: v.driver.firstName,
          last_name: v.driver.lastName,
          phone: v.driver.phone || '',
        } : null,
        order: v.order ? {
          id: v.order.id,
          status: v.order.status,
          priority: v.order.priority,
          pickup_address: v.order.pickupAddress,
          delivery_address: v.order.deliveryAddress,
          created_at: v.order.createdAt.getTime(),
        } : null,
      },
    }
  }

  @GrpcMethod('FleetService', 'AssignVehicle')
  async assignVehicle(
    request: AssignVehicleRequest,
  ): Promise<AssignVehicleResponse> {
    try {
      await this.fleetService.assignVehicle(
        request.vehicle_id,
        '',
        request.order_id,
      )
      return { success: true }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      return { success: false, message }
    }
  }

  @GrpcMethod('FleetService', 'ReleaseVehicle')
  async releaseVehicle(
    request: ReleaseVehicleRequest,
  ): Promise<ReleaseVehicleResponse> {
    try {
      await this.fleetService.releaseVehicle(request.vehicle_id)
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  @GrpcMethod('FleetService', 'UpdateVehicle')
  async updateVehicle(
    request: UpdateVehicleRequest,
  ): Promise<UpdateVehicleResponse> {
    try {
      const result = await this.fleetService.updateVehicle(
        request.vehicle_id,
        {
          type: request.type,
          capacityKg: request.capacity_kg,
          capacityM3: request.capacity_m3,
          currentLat: request.current_lat,
          currentLng: request.current_lng,
        },
        request.expected_version,
      )
      if (!result.success) {
        return { success: false, message: result.message, vehicle: null }
      }
      const v = result.vehicle.vehicle
      if (!v) {
        return { success: false, message: 'Vehicle not found', vehicle: null }
      }
      return {
        success: true,
        message: result.message,
        vehicle: {
          id: v.id,
          type: v.type,
          capacity_kg: v.capacityKg,
          capacity_m3: Number(v.capacityM3),
          status: v.status,
          current_lat: v.currentLat || 0,
          current_lng: v.currentLng || 0,
          current_driver_id: v.currentDriverId || '',
          current_order_id: v.currentOrderId || '',
          last_update: v.lastUpdate.getTime(),
          version: v.version,
          created_at: v.createdAt.getTime(),
          driver: v.driver ? {
            id: v.driver.id,
            email: v.driver.email,
            first_name: v.driver.firstName,
            last_name: v.driver.lastName,
            phone: v.driver.phone || '',
          } : null,
          order: v.order ? {
            id: v.order.id,
            status: v.order.status,
            priority: v.order.priority,
            pickup_address: v.order.pickupAddress,
            delivery_address: v.order.deliveryAddress,
            created_at: v.order.createdAt.getTime(),
          } : null,
        },
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      return { success: false, message, vehicle: null }
    }
  }
}