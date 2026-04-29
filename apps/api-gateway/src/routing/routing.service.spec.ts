import { RoutingService } from './routing.service';
import { ConfigService } from '@nestjs/config';

const routingClient = {
  calculateRoute: jest.fn(),
  getRoute: jest.fn(),
};

const mockClientGrpc = {
  getService: jest.fn().mockReturnValue(routingClient),
};

const mockConfigService = {
  get: jest.fn(),
};

describe('RoutingService', () => {
  let service: RoutingService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new RoutingService(
      mockClientGrpc as any,
    );
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateRoute()', () => {
    it('should return route from gRPC', async () => {
      const route = {
        order_id: 'order-1',
        vehicle_id: 'vehicle-1',
        distance_km: 15.5,
        duration_min: 25,
        polyline: ['55.7558,37.6173', '55.76,37.62'],
      };
      routingClient.calculateRoute.mockResolvedValue(route);

      const result = await service.calculateRoute({
        order_id: 'order-1',
        vehicle_id: 'vehicle-1',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.76, lng: 37.62 },
      });

      expect(routingClient.calculateRoute).toHaveBeenCalled();
      expect(result).toEqual(route);
    });

    it('should return null on error', async () => {
      routingClient.calculateRoute.mockRejectedValue(new Error('Routing failed'));

      const result = await service.calculateRoute({
        order_id: 'order-1',
        vehicle_id: 'vehicle-1',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.76, lng: 37.62 },
      });

      expect(result).toBeNull();
    });
  });

  describe('getRoute()', () => {
    it('should return route by id', async () => {
      const route = {
        order_id: 'order-1',
        vehicle_id: 'vehicle-1',
        distance_km: 15.5,
      };
      routingClient.getRoute.mockResolvedValue(route);

      const result = await service.getRoute('route-1');

      expect(routingClient.getRoute).toHaveBeenCalledWith({ route_id: 'route-1' });
      expect(result).toEqual(route);
    });

    it('should return null on error', async () => {
      routingClient.getRoute.mockRejectedValue(new Error('Not found'));

      const result = await service.getRoute('nonexistent');

      expect(result).toBeNull();
    });
  });
});
