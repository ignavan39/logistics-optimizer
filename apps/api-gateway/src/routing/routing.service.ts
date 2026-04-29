import { Injectable, type OnModuleInit, type OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { CalculateRouteDto, type GetRouteDto } from './dto/routing.dto';

interface RoutingGrpcClient {
  calculateRoute(data: CalculateRouteDto): Promise<any>;
  getRoute(data: GetRouteDto): Promise<any>;
}

@Injectable()
export class RoutingService implements OnModuleInit, OnModuleDestroy {
  private routingClient!: RoutingGrpcClient;

  constructor(
    @Inject('ROUTING_PACKAGE') private client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.routingClient = this.client.getService<RoutingGrpcClient>('RoutingService');
  }

  onModuleDestroy() {}

  async calculateRoute(dto: CalculateRouteDto) {
    try {
      return await this.routingClient.calculateRoute({
        order_id: dto.order_id,
        vehicle_id: dto.vehicle_id,
        origin: { lat: dto.origin.lat, lng: dto.origin.lng },
        destination: { lat: dto.destination.lat, lng: dto.destination.lng },
      });
    } catch (e) {
      Logger.error(`Failed to calculate route: ${e}`, RoutingService.name);
      return null;
    }
  }

  async getRoute(routeId: string) {
    try {
      return await this.routingClient.getRoute({ route_id: routeId });
    } catch (e) {
      Logger.error(`Failed to get route ${routeId}: ${e}`, RoutingService.name);
      return null;
    }
  }
}
