import { Injectable, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientGrpc } from '@nestjs/microservices'
import { Inject } from '@nestjs/common'
import { Metadata } from '@grpc/grpc-js'
import { Observable } from 'rxjs'
import {
  type GetAvailableVehiclesDto,
  type AssignVehicleDto,
  type ReleaseVehicleDto,
  type UpdateVehicleDto,
} from './dto/fleet.dto'

interface VehicleResponse {
  id: string
  type: string
  status: string
  capacity_kg?: number
  capacity_m3?: number
  current_location?: { lat: number; lng: number }
}

interface VehiclesListResponse {
  vehicles: VehicleResponse[]
}

interface AssignVehicleResponse {
  success: boolean
  vehicle_id?: string
  error?: string
}

interface UpdateVehicleResponse {
  id: string
  type?: string
  status?: string
}

interface FleetGrpcClient {
  getAvailableVehicles(data: GetAvailableVehiclesDto, metadata?: Metadata): Observable<VehiclesListResponse>
  getVehicle(data: { vehicleId: string }, metadata?: Metadata): Observable<VehicleResponse | null>
  getVehicleDetails(data: { vehicleId: string }, metadata?: Metadata): Observable<VehicleResponse | null>
  assignVehicle(data: AssignVehicleDto, metadata?: Metadata): Observable<AssignVehicleResponse>
  releaseVehicle(data: ReleaseVehicleDto, metadata?: Metadata): Observable<{ success: boolean }>
  updateVehicle(data: { vehicle_id: string } & Partial<UpdateVehicleDto>, metadata?: Metadata): Observable<UpdateVehicleResponse>
}

@Injectable()
export class FleetService implements OnModuleInit, OnModuleDestroy {
  private fleetClient!: FleetGrpcClient

  constructor(
    @Inject('FLEET_PACKAGE') private client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.fleetClient = this.client.getService<FleetGrpcClient>('FleetService')
  }

  onModuleDestroy() {}

  async getAvailableVehicles(dto: GetAvailableVehiclesDto) {
    return this.fleetClient.getAvailableVehicles({
      near_point: dto.near_point ? { lat: dto.near_point.lat, lng: dto.near_point.lng } : undefined,
      radius_km: dto.radius_km ?? 10,
      min_capacity_kg: dto.min_capacity_kg ?? 0,
      min_capacity_m3: dto.min_capacity_m3 ?? 0,
      limit: dto.limit ?? 10,
    })
  }

  async getVehicle(vehicleId: string) {
    return this.fleetClient.getVehicle({ vehicleId })
  }

  async getVehicleDetails(vehicleId: string) {
    return this.fleetClient.getVehicleDetails({ vehicleId })
  }

  async assignVehicle(dto: AssignVehicleDto) {
    return this.fleetClient.assignVehicle({
      vehicle_id: dto.vehicle_id,
      order_id: dto.order_id,
      expected_version: dto.expected_version ?? 0,
    })
  }

  async releaseVehicle(dto: ReleaseVehicleDto) {
    return this.fleetClient.releaseVehicle({
      vehicle_id: dto.vehicle_id,
      order_id: dto.order_id,
    })
  }

  async updateVehicle(vehicleId: string, dto: Partial<UpdateVehicleDto>) {
    return this.fleetClient.updateVehicle({
      vehicle_id: vehicleId,
      type: dto.type,
      capacity_kg: dto.capacity_kg,
      capacity_m3: dto.capacity_m3,
      current_lat: dto.current_lat,
      current_lng: dto.current_lng,
      expected_version: dto.expected_version,
    })
  }
}