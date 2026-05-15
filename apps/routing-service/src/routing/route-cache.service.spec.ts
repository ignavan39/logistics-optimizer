import { RouteCacheService } from './route-cache.service';
import { Route } from '../routing.service';

describe('RouteCacheService', () => {
  let service: RouteCacheService;
  let mockDataSource: any;
  let mockConfigService: any;
  let mockRedis: any;

  const testRoute: Route = {
    id: 'route-123',
    origin: { lat: 55.75, lng: 37.61 },
    destination: { lat: 55.76, lng: 37.62 },
    waypoints: [],
    distanceMeters: 15000,
    durationSeconds: 1000,
    status: 'ROUTE_STATUS_CALCULATED',
    vehicleId: 'truck-1',
  };

  beforeEach(async () => {
    mockDataSource = {
      query: jest.fn(),
    };

    mockRedis = {
      get: jest.fn(),
      setex: jest.fn(),
      quit: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultValue: any) => {
        const config: Record<string, any> = {
          CACHE_REDIS_HOST: 'redis',
          CACHE_REDIS_PORT: 6379,
          ROUTE_CACHE_WARMUP: 'false',
          WARMUP_ROUTES: '',
        };
        return config[key] ?? defaultValue;
      }),
    };

    service = new RouteCacheService(mockDataSource, mockConfigService);
    (service as any).redis = mockRedis;
  });

  describe('normalizeKey', () => {
    it('should round coordinates to 2 decimals', () => {
      const key = (service as any).normalizeKey(55.755231, 37.615671, 55.76, 37.62, undefined);
      expect(key).toBe('55.76:37.62:55.76:37.62');
    });

    it('should include vehicleId in key', () => {
      const key = (service as any).normalizeKey(55.75, 37.61, 55.76, 37.62, 'truck');
      expect(key).toBe('55.75:37.61:55.76:37.62:truck');
    });

    it('should handle no vehicleId', () => {
      const key = (service as any).normalizeKey(55.75, 37.61, 55.76, 37.62, undefined);
      expect(key).toBe('55.75:37.61:55.76:37.62');
    });
  });

  describe('getRoute', () => {
    it('should return cached route from Redis', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify({
        routeData: testRoute,
        createdAt: new Date(),
      }));

      const result = await service.getRoute(55.75, 37.61, 55.76, 37.62);

      expect(result).toEqual(testRoute);
      expect(mockRedis.get).toHaveBeenCalledWith('route:55.75:37.61:55.76:37.62');
    });

    it('should fallback to PostgreSQL when Redis miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDataSource.query.mockResolvedValue([{
        route_data: testRoute,
        created_at: new Date(),
      }]);

      const result = await service.getRoute(55.75, 37.61, 55.76, 37.62);

      expect(result).toEqual(testRoute);
      expect(mockDataSource.query).toHaveBeenCalled();
    });

    it('should return null on cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getRoute(55.75, 37.61, 55.76, 37.62);

      expect(result).toBeNull();
    });

    it('should handle Redis error gracefully', async () => {
      (service as any).redis = {
        get: jest.fn().mockImplementation(() => Promise.reject(new Error('Redis down'))),
      };
      mockDataSource.query.mockResolvedValue([]);

      const result = await service.getRoute(55.75, 37.61, 55.76, 37.62);

      expect(result).toBeNull();
    });
  });

  describe('setRoute', () => {
    it('should save to Redis with TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      mockDataSource.query.mockResolvedValue([]);

      await service.setRoute(testRoute, 55.75, 37.61, 55.76, 37.62, 'truck');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'route:55.75:37.61:55.76:37.62:truck',
        86400,
        expect.any(String)
      );
    });

    it('should save to PostgreSQL', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      mockDataSource.query.mockResolvedValue([]);

      await service.setRoute(testRoute, 55.75, 37.61, 55.76, 37.62, 'truck');

      expect(mockDataSource.query).toHaveBeenCalled();
    });

    it('should still save to PostgreSQL when Redis fails', async () => {
      (service as any).redis = {
        setex: jest.fn().mockImplementation(() => Promise.reject(new Error('Redis down'))),
      };
      mockDataSource.query.mockResolvedValue([]);

      await service.setRoute(testRoute, 55.75, 37.61, 55.76, 37.62);

      expect(mockDataSource.query).toHaveBeenCalled();
    });
  });

  describe('warmup', () => {
    it('should skip when WARMUP_ROUTES is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ROUTE_CACHE_WARMUP') return 'false';
        return '';
      });

      await service.warmup();

      expect(mockRedis.get).not.toHaveBeenCalled();
    });

    it('should skip when Redis is not available', async () => {
      (service as any).redis = undefined;

      await service.warmup();

      expect(mockRedis.get).not.toHaveBeenCalled();
    });
  });

  describe('clearStaleCache', () => {
    it('should delete old cache entries', async () => {
      mockDataSource.query.mockResolvedValue([{ id: '1' }, { id: '2' }]);

      await service.clearStaleCache();

      expect(mockDataSource.query).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDataSource.query.mockRejectedValue(new Error('DB error'));

      await service.clearStaleCache();

      expect(mockDataSource.query).toHaveBeenCalled();
    });
  });
});