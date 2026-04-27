import { Injectable, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common'
import { type ConfigService } from '@nestjs/config'
import { type ClientGrpc } from '@nestjs/microservices'
import { Inject } from '@nestjs/common'
import { type Metadata } from '@grpc/grpc-js'
import {
  type GetAvailableVehiclesDto,
  type AssignVehicleDto,
  type ReleaseVehicleDto,
} from './dto/fleet.dto'

interface FleetGrpcClient {
  getAvailableVehicles(data: GetAvailableVehiclesDto, metadata?: Metadata): any
  getVehicle(data: { vehicleId: string }, metadata?: Metadata): any
  getVehicleDetails(data: { vehicleId: string }, metadata?: Metadata): any
  assignVehicle(data: AssignVehicleDto, metadata?: Metadata): any
  releaseVehicle(data: ReleaseVehicleDto, metadata?: Metadata): any
  updateVehicle(data: any, metadata?: Metadata): any
}

@Injectable()
export class FleetService implements OnModuleInit, OnModuleDestroy {
  private fleetClient!: FleetGrpcClient

  constructor(
    private configService: ConfigService,
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

  async updateVehicle(vehicleId: string, dto: {
    type?: string
    capacity_kg?: number
    capacity_m3?: number
    current_lat?: number
    current_lng?: number
    expected_version?: number
  }) {
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