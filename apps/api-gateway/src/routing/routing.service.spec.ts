import { Test, type TestingModule } from '@nestjs/testing';

import { ConfigService } from '@nestjs/config';
import { RoutingService } from './routing.service';

describe('RoutingService', () => {
  let service: RoutingService;
  let routingClient: any;

  const mockRoutingClient = {
    calculateRoute: jest.fn().mockResolvedValue({ waypoints: [], distance: 5000 }),
    getRoute: jest.fn().mockResolvedValue({ id: 'route-1', waypoints: [] }),
  };

  beforeEach(async () => {
    const mockClientGrpc = {
      getService: jest.fn().mockReturnValue(mockRoutingClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutingService,
        { provide: 'ROUTING_PACKAGE', useValue: mockClientGrpc },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<RoutingService>(RoutingService);
    service.onModuleInit();
    routingClient = mockRoutingClient;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateRoute', () => {
    it('should calculate route with origin and destination', async () => {
      const dto = {
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      };

      const result = await service.calculateRoute(dto);

      expect(routingClient.calculateRoute).toHaveBeenCalledWith({
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      });
      expect(result).toHaveProperty('waypoints');
    });

    it('should pass order_id when provided', async () => {
      const dto = {
        order_id: 'order-1',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      };

      await service.calculateRoute(dto);

      expect(routingClient.calculateRoute).toHaveBeenCalledWith(
        expect.objectContaining({ order_id: 'order-1' }),
      );
    });

    it('should pass vehicle_id when provided', async () => {
      const dto = {
        vehicle_id: 'vehicle-1',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      };

      await service.calculateRoute(dto);

      expect(routingClient.calculateRoute).toHaveBeenCalledWith(
        expect.objectContaining({ vehicle_id: 'vehicle-1' }),
      );
    });
  });

  describe('getRoute', () => {
    it('should get route by id', async () => {
      const result = await service.getRoute('route-1');

      expect(routingClient.getRoute).toHaveBeenCalledWith({ route_id: 'route-1' });
      expect(result).toHaveProperty('id');
    });
  });
});