import { RetentionService } from './retention.service';

describe('RetentionService', () => {
  let service: RetentionService;
  let mockDataSource: any;
  let mockConfigService: any;
  let mockKafkaAdmin: any;

  beforeEach(() => {
    mockDataSource = {
      query: jest.fn(),
    };

    mockKafkaAdmin = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      fetchOffsets: jest.fn().mockResolvedValue([
        {
          topic: 'vehicle.telemetry',
          partitions: [{ partition: 0, offset: '100', highOffset: '500' }],
        },
      ]),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultValue: string) => {
        if (key === 'RETENTION_ENABLED') return 'false';
        if (key === 'KAFKA_BROKER') return 'kafka:9092';
        if (key === 'KAFKA_GROUP_ID_PREFIX') return 'logistics';
        return defaultValue;
      }),
    };
  });

  describe('isEnabled', () => {
    it('should return false by default', () => {
      service = new RetentionService(mockDataSource, mockConfigService);
      expect(service.isEnabled()).toBe(false);
    });

    it('should return true when RETENTION_ENABLED=true', () => {
      mockConfigService.get = jest.fn(() => 'true');
      service = new RetentionService(mockDataSource, mockConfigService);
      expect(service.isEnabled()).toBe(true);
    });

    it('should return false when RETENTION_ENABLED=false', () => {
      mockConfigService.get = jest.fn(() => 'false');
      service = new RetentionService(mockDataSource, mockConfigService);
      expect(service.isEnabled()).toBe(false);
    });
  });
});