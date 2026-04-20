import { Controller, Logger } from '@nestjs/common'
import { GrpcMethod, RpcException } from '@nestjs/microservices'
import { status as GrpcStatus } from '@grpc/grpc-js'

interface GetAvailableVehiclesRequest {
  near_point: { lat: number; lng: number }
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
    current_location: { lat: number; lng: number }
    last_update: number
  }>
}

interface GetVehicleRequest {
  vehicle_id: string
}

interface GetVehicleResponse {
  vehicle: {
    id: string
    type: string
    capacity_kg: number
    capacity_m3: number
    status: string
    version: number
  }
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

@Controller()
export class FleetGrpcController {
  private readonly logger = new Logger(FleetGrpcController.name)
  private readonly vehicles = new Map<string, any>()

  constructor() {
    for (let i = 0; i < 50; i++) {
      const id = `vehicle-${i + 1}`
      this.vehicles.set(id, {
        id,
        type: i < 30 ? 'VEHICLE_TYPE_VAN' : 'VEHICLE_TYPE_TRUCK',
        capacity_kg: i < 30 ? 1500 : 5000,
        capacity_m3: i < 30 ? 8 : 20,
        status: 'VEHICLE_STATUS_IDLE',
        version: 1,
        current_location: {
          lat: 55.7558 + (Math.random() - 0.5) * 0.1,
          lng: 37.6173 + (Math.random() - 0.5) * 0.1,
        },
        last_update: Date.now(),
      })
    }
  }

  @GrpcMethod('FleetService', 'GetAvailableVehicles')
  async getAvailableVehicles(
    request: GetAvailableVehiclesRequest,
  ): Promise<GetAvailableVehiclesResponse> {
    const idleVehicles = Array.from(this.vehicles.values()).filter(
      (v) => v.status === 'VEHICLE_STATUS_IDLE',
    )

    return {
      vehicles: idleVehicles.slice(0, request.limit || 10),
    }
  }

  @GrpcMethod('FleetService', 'GetVehicle')
  async getVehicle(request: GetVehicleRequest): Promise<GetVehicleResponse> {
    const vehicle = this.vehicles.get(request.vehicle_id)
    if (!vehicle) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: `Vehicle ${request.vehicle_id} not found`,
      })
    }
    return { vehicle }
  }

  @GrpcMethod('FleetService', 'AssignVehicle')
  async assignVehicle(
    request: AssignVehicleRequest,
  ): Promise<AssignVehicleResponse> {
    const vehicle = this.vehicles.get(request.vehicle_id)
    if (!vehicle) {
      return { success: false, message: 'Vehicle not found' }
    }
    if (vehicle.version !== request.expected_version) {
      return { success: false, message: 'Version mismatch' }
    }
    if (vehicle.status !== 'VEHICLE_STATUS_IDLE') {
      return { success: false, message: 'Vehicle not available' }
    }

    vehicle.status = 'VEHICLE_STATUS_ASSIGNED'
    vehicle.version++
    return { success: true }
  }

  @GrpcMethod('FleetService', 'ReleaseVehicle')
  async releaseVehicle(
    request: ReleaseVehicleRequest,
  ): Promise<ReleaseVehicleResponse> {
    const vehicle = this.vehicles.get(request.vehicle_id)
    if (!vehicle) {
      return { success: false }
    }

    vehicle.status = 'VEHICLE_STATUS_IDLE'
    vehicle.version++
    return { success: true }
  }
}