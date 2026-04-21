import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientGrpc } from '@nestjs/microservices'
import { Inject } from '@nestjs/common'
import { GetLatestPositionDto, GetTrackDto } from './dto/tracking.dto'

interface TrackingGrpcClient {
  getLatestPosition(data: GetLatestPositionDto): Promise<any>
  getTrack(data: GetTrackDto): Promise<any>
}

@Injectable()
export class TrackingService implements OnModuleInit, OnModuleDestroy {
  private trackingClient!: TrackingGrpcClient

  constructor(
    private configService: ConfigService,
    @Inject('TRACKING_PACKAGE') private client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.trackingClient = this.client.getService<TrackingGrpcClient>('TrackingService')
  }

  onModuleDestroy() {}

  async getLatestPosition(vehicleId: string) {
    return this.trackingClient.getLatestPosition({ vehicle_id: vehicleId })
  }

  async getTrack(dto: GetTrackDto) {
    return this.trackingClient.getTrack({
      vehicle_id: dto.vehicle_id,
      from_unix: dto.from_unix ?? Math.floor(Date.now() / 1000) - 3600,
      to_unix: dto.to_unix ?? Math.floor(Date.now() / 1000),
      max_points: dto.max_points ?? 100,
    })
  }
}