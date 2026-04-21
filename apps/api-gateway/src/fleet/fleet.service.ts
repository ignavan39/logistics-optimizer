import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientGrpc } from '@nestjs/microservices'
import { Inject } from '@nestjs/common'
import {
  GetAvailableVehiclesDto,
  GetVehicleDto,
  AssignVehicleDto,
  ReleaseVehicleDto,
} from './dto/fleet.dto'

interface FleetGrpcClient {
  getAvailableVehicles(data: GetAvailableVehiclesDto): Promise<any>
  getVehicle(data: GetVehicleDto): Promise<any>
  assignVehicle(data: AssignVehicleDto): Promise<any>
  releaseVehicle(data: ReleaseVehicleDto): Promise<any>
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
    return this.fleetClient.getVehicle({ vehicle_id: vehicleId })
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
}