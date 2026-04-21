import { Test, TestingModule } from '@nestjs/testing';
import { ClientGrpc, ClientsModule, Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderClient: any;

  const mockOrderClient = {
    createOrder: jest.fn().mockResolvedValue({ id: 'order-123', customerId: 'cust-1' }),
    getOrder: jest.fn().mockResolvedValue({ id: 'order-123' }),
    listOrders: jest.fn().mockResolvedValue({ orders: [], total: 0 }),
    updateOrderStatus: jest.fn().mockResolvedValue({ id: 'order-123', status: 2 }),
    cancelOrder: jest.fn().mockResolvedValue({ success: true }),
  };

  beforeEach(async () => {
    const mockClientGrpc = {
      getService: jest.fn().mockReturnValue(mockOrderClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: 'ORDERS_PACKAGE', useValue: mockClientGrpc },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    service.onModuleInit();
    orderClient = mockOrderClient;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('should create order successfully', async () => {
      const dto = {
        customer_id: 'cust-1',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      };

      const result = await service.createOrder(dto);

      expect(orderClient.createOrder).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('id');
    });
  });

  describe('getOrder', () => {
    it('should get order by id', async () => {
      const result = await service.getOrder('order-123');

      expect(orderClient.getOrder).toHaveBeenCalledWith({ order_id: 'order-123' });
      expect(result).toHaveProperty('id');
    });
  });

  describe('listOrders', () => {
    it('should list orders with pagination', async () => {
      const dto = { customer_id: 'cust-1', page: 1, limit: 10 };

      const result = await service.listOrders(dto);

      expect(orderClient.listOrders).toHaveBeenCalled();
      expect(result).toHaveProperty('orders');
    });

    it('should use default pagination values', async () => {
      await service.listOrders({});

      expect(orderClient.listOrders).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 20 }),
      );
    });
  });

  describe('updateOrderStatus', () => {
    it('should update order status', async () => {
      const dto = { order_id: 'order-123', status: 2 };

      const result = await service.updateOrderStatus(dto);

      expect(orderClient.updateOrderStatus).toHaveBeenCalledWith(
        expect.objectContaining({ order_id: 'order-123', status: 2 }),
      );
    });
  });

  describe('cancelOrder', () => {
    it('should cancel order', async () => {
      const dto = { order_id: 'order-123', reason: 'Test cancellation' };

      const result = await service.cancelOrder(dto);

      expect(orderClient.cancelOrder).toHaveBeenCalledWith(dto);
    });
  });
});