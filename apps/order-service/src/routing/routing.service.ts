import { Injectable, Logger } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { type ClientGrpc } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';

interface RouteResponse {
  distanceKm: number;
  durationMinutes: number;
  points: Array<{ lat: number; lng: number }>;
}

interface RoutingGrpcClient {
  calculateRoute(data: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
  }): Promise<RouteResponse>;
}

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private client?: RoutingGrpcClient;

  constructor(
    private configService: ConfigService,
    @Inject('ROUTING_PACKAGE') private grpcClient: ClientGrpc,
  ) {}

  async calculateDistance(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ): Promise<number> {
    if (!this.client) {
      this.client = this.grpcClient.getService<RoutingGrpcClient>('RoutingService');
    }

    try {
      const route = await this.client.calculateRoute({
        origin: { lat: originLat, lng: originLng },
        destination: { lat: destLat, lng: destLng },
      });
      return route.distanceKm;
    } catch (e) {
      this.logger.error(`Failed to calculate route: ${String(e)}`);
      return 0;
    }
  }
}