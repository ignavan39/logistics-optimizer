import { Test, TestingModule } from '@nestjs/testing';
import { ClientGrpc } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { FleetService } from './fleet.service';

describe('FleetService', () => {
  let service: FleetService;
  let fleetClient: any;

  const mockFleetClient = {
    getAvailableVehicles: jest.fn().mockResolvedValue({ vehicles: [], total: 0 }),
    getVehicle: jest.fn().mockResolvedValue({ id: 'vehicle-1', status: 'available' }),
    assignVehicle: jest.fn().mockResolvedValue({ success: true }),
    releaseVehicle: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    const mockClientGrpc = {
      getService: jest.fn().mockReturnValue(mockFleetClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetService,
        { provide: 'FLEET_PACKAGE', useValue: mockClientGrpc },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<FleetService>(FleetService);
    service.onModuleInit();
    fleetClient = mockFleetClient;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAvailableVehicles', () => {
    it('should get available vehicles', async () => {
      const dto = { near_point: { lat: 55.7558, lng: 37.6173 }, limit: 10 };

      const result = await service.getAvailableVehicles(dto);

      expect(fleetClient.getAvailableVehicles).toHaveBeenCalled();
      expect(result).toHaveProperty('vehicles');
    });

    it('should use default values for missing params', async () => {
      await service.getAvailableVehicles({});

      expect(fleetClient.getAvailableVehicles).toHaveBeenCalledWith(
        expect.objectContaining({
          radius_km: 10,
          min_capacity_kg: 0,
          min_capacity_m3: 0,
          limit: 10,
        }),
      );
    });

    it('should pass near_point parameters', async () => {
      await service.getAvailableVehicles({ near_point: { lat: 55.0, lng: 37.0 } });

      expect(fleetClient.getAvailableVehicles).toHaveBeenCalledWith(
        expect.objectContaining({
          near_point: { lat: 55.0, lng: 37.0 },
        }),
      );
    });
  });

  describe('getVehicle', () => {
    it('should get vehicle by id', async () => {
      const result = await service.getVehicle('vehicle-1');

      expect(fleetClient.getVehicle).toHaveBeenCalledWith({ vehicle_id: 'vehicle-1' });
      expect(result).toHaveProperty('id');
    });
  });

  describe('assignVehicle', () => {
    it('should assign vehicle to order', async () => {
      const dto = { vehicle_id: 'vehicle-1', order_id: 'order-1' };

      const result = await service.assignVehicle(dto);

      expect(fleetClient.assignVehicle).toHaveBeenCalledWith(
        expect.objectContaining({ vehicle_id: 'vehicle-1', order_id: 'order-1' }),
      );
    });
  });

  describe('releaseVehicle', () => {
    it('should release vehicle from order', async () => {
      const dto = { vehicle_id: 'vehicle-1', order_id: 'order-1' };

      const result = await service.releaseVehicle(dto);

      expect(fleetClient.releaseVehicle).toHaveBeenCalledWith(dto);
    });
  });
});