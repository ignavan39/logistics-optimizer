import { Test, type TestingModule } from '@nestjs/testing';
import { DispatchSagaService, SagaStatus } from './dispatch-saga.service';
import { ClientGrpc } from '@nestjs/microservices';
import { getDataSourceToken } from '@nestjs/typeorm';

describe('DispatchSagaService', () => {
  let service: DispatchSagaService;

  const mockDataSource = {
    query: jest.fn().mockResolvedValue([]),
  };

  const mockFleetClient = {
    getService: jest.fn().mockReturnValue({
      getAvailableVehicles: jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          pipe: jest.fn().mockReturnValue({
            toPromise: jest.fn().mockResolvedValue({
              vehicles: [{ id: 'v-1', version: 1 }],
            }),
          }),
        }),
      }),
      assignVehicle: jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          toPromise: jest.fn().mockResolvedValue({ success: true }),
        }),
      }),
      releaseVehicle: jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          toPromise: jest.fn().mockResolvedValue({ success: true }),
        }),
      }),
    }),
  } as unknown as ClientGrpc;

  const mockRoutingClient = {
    getService: jest.fn().mockReturnValue({
      calculateRoute: jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          toPromise: jest.fn().mockResolvedValue({ route_id: 'r-1' }),
        }),
      }),
    }),
  } as unknown as ClientGrpc;

  const mockOrderClient = {
    getService: jest.fn().mockReturnValue({
      getOrder: jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          toPromise: jest.fn().mockResolvedValue({
            order_id: 'o-1',
            customer_id: 'c-1',
            origin: { lat: 55.7558, lng: 37.6173 },
            destination: { lat: 55.7558, lng: 37.6173 },
            weight_kg: 10,
            volume_m3: 0.5,
          }),
        }),
      }),
      updateOrderStatus: jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnValue({
          toPromise: jest.fn().mockResolvedValue({ success: true }),
        }),
      }),
    }),
  } as unknown as ClientGrpc;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchSagaService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: 'FLEET_SERVICE', useValue: mockFleetClient },
        { provide: 'ROUTING_SERVICE', useValue: mockRoutingClient },
        { provide: 'ORDER_SERVICE', useValue: mockOrderClient },
      ],
    }).compile();

    service = module.get<DispatchSagaService>(DispatchSagaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startDispatch', () => {
    it('should create a new saga with pending status', async () => {
      const saga = await service.startDispatch('order-1');

      expect(saga).toBeDefined();
      expect(saga.orderId).toBe('order-1');
      expect(saga.status).toBe(SagaStatus.PENDING);
      expect(saga.retryCount).toBe(0);
    });

    it('should persist saga to database', async () => {
      await service.startDispatch('order-2');

      expect(mockDataSource.query).toHaveBeenCalled();
    });

    it('should store saga in memory', async () => {
      const saga = await service.startDispatch('order-3');

      expect(service.getSaga(saga.sagaId)).toBeDefined();
    });
  });

  describe('getSaga', () => {
    it('should return saga by id', async () => {
      const created = await service.startDispatch('order-4');
      const retrieved = service.getSaga(created.sagaId);

      expect(retrieved).toBeDefined();
      expect(retrieved!.orderId).toBe('order-4');
    });

    it('should return undefined for non-existent saga', () => {
      const saga = service.getSaga('non-existent');

      expect(saga).toBeUndefined();
    });
  });
});