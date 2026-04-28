import { TrackingService } from './tracking.service';
import { ConfigService } from '@nestjs/config';

const trackingClient = {
  getLatestPosition: jest.fn().mockResolvedValue({ vehicleId: 'vehicle-1', lat: 55.7558, lng: 37.6173 }),
  getTrack: jest.fn().mockResolvedValue({ points: [], total: 0 }),
};

const mockClientGrpc = {
  getService: jest.fn().mockReturnValue(trackingClient),
};

const mockConfigService = {
  get: jest.fn(),
};

describe('TrackingService', () => {
  let service: TrackingService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new TrackingService(
      mockConfigService as any,
      mockClientGrpc as any,
    );
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLatestPosition', () => {
    it('should get latest position for vehicle', async () => {
      const result = await service.getLatestPosition('vehicle-1');

      expect(trackingClient.getLatestPosition).toHaveBeenCalledWith({ vehicle_id: 'vehicle-1' });
      expect(result).toHaveProperty('vehicleId');
    });
  });

  describe('getTrack', () => {
    it('should get track with provided params', async () => {
      const dto = {
        vehicle_id: 'vehicle-1',
        from_unix: 1700000000,
        to_unix: 1700100000,
        max_points: 100,
      };

      const result = await service.getTrack(dto);

      expect(trackingClient.getTrack).toHaveBeenCalledWith(dto);
    });

    it('should use default time values when not provided', async () => {
      const now = Math.floor(Date.now() / 1000);

      await service.getTrack({ vehicle_id: 'vehicle-1' });

      expect(trackingClient.getTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicle_id: 'vehicle-1',
          from_unix: expect.any(Number),
          to_unix: expect.any(Number),
          max_points: 100,
        }),
      );
    });
  });
});
