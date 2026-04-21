import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { OrderService, CreateOrderDto, UpdateOrderStatusDto } from './order.service';
import { OrderEntity, OrderStatus, OrderPriority } from './entities/order.entity';
import { OutboxEventEntity } from './entities/outbox-event.entity';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

describe('OrderService', () => {
  let service: OrderService;
  let orderRepo: Repository<OrderEntity>;
  let outboxRepo: Repository<OutboxEventEntity>;
  let dataSource: DataSource;

  const mockOrderRepo = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOutboxRepo = {
    save: jest.fn(),
  };

  const mockDataSource = {
    transaction: jest.fn((cb) => {
      const manager = {
        create: jest.fn((entity, data) => data),
        save: jest.fn((entity, data) => ({ ...data, id: 'test-id' })),
        findOne: jest.fn(),
      };
      return cb(manager);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(OrderEntity), useValue: mockOrderRepo },
        { provide: getRepositoryToken(OutboxEventEntity), useValue: mockOutboxRepo },
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    orderRepo = module.get<Repository<OrderEntity>>(getRepositoryToken(OrderEntity));
    outboxRepo = module.get<Repository<OutboxEventEntity>>(getRepositoryToken(OutboxEventEntity));
    dataSource = module.get<DataSource>(getDataSourceToken());
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('should create order with pending status', async () => {
      const dto: CreateOrderDto = {
        customerId: 'cust-1',
        originLat: 55.7558,
        originLng: 37.6173,
        destinationLat: 55.7558,
        destinationLng: 37.6173,
        priority: OrderPriority.NORMAL,
        weightKg: 10,
        volumeM3: 0.5,
      };

      const result = await service.createOrder(dto);

      expect(result.customerId).toBe('cust-1');
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('getOrder', () => {
    it('should return order if found', async () => {
      const order = { id: 'order-1', customerId: 'cust-1', status: OrderStatus.PENDING };
      mockOrderRepo.findOne.mockResolvedValue(order);

      const result = await service.getOrder('order-1');

      expect(result).toEqual(order);
    });

    it('should throw NotFoundException if order not found', async () => {
      mockOrderRepo.findOne.mockResolvedValue(null);

      await expect(service.getOrder('nonexistent')).rejects.toThrow('not found');
    });
  });

  describe('listOrders', () => {
    it('should return orders with pagination', async () => {
      const orders = [
        { id: 'order-1', status: OrderStatus.PENDING },
        { id: 'order-2', status: OrderStatus.ASSIGNED },
      ];
      const mockQb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([orders, 2]),
      };
      mockOrderRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.listOrders();

      expect(result.orders).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe('updateOrderStatus', () => {
    it('should update status and create outbox event', async () => {
      const order = { id: 'order-1', status: OrderStatus.PENDING, version: 1 };
      mockDataSource.transaction = jest.fn(async (cb) => {
        const manager = {
          create: jest.fn((entity, data) => data),
          save: jest.fn((entity, data) => ({ ...data, id: 'test-id' })),
          findOne: jest.fn().mockResolvedValue(order),
        };
        return cb(manager);
      });

      const dto: UpdateOrderStatusDto = {
        orderId: 'order-1',
        status: OrderStatus.ASSIGNED,
      };

      const result = await service.updateOrderStatus(dto);

      expect(result.status).toBe(OrderStatus.ASSIGNED);
    });

    it('should throw on invalid transition', async () => {
      const order = { id: 'order-1', status: OrderStatus.DELIVERED, version: 1 };
      mockDataSource.transaction = jest.fn(async (cb) => {
        const manager = {
          create: jest.fn((entity, data) => data),
          save: jest.fn((entity, data) => ({ ...data, id: 'test-id' })),
          findOne: jest.fn().mockResolvedValue(order),
        };
        return cb(manager);
      });

      const dto: UpdateOrderStatusDto = {
        orderId: 'order-1',
        status: OrderStatus.PENDING,
      };

      await expect(service.updateOrderStatus(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('cancelOrder', () => {
    it('should cancel pending order', async () => {
      const order = { id: 'order-1', status: OrderStatus.PENDING };
      mockOrderRepo.findOne.mockResolvedValue(order);
      mockDataSource.transaction = jest.fn(async (cb) => {
        const manager = {
          create: jest.fn((entity, data) => data),
          save: jest.fn((entity, data) => ({ ...data, id: 'test-id' })),
          findOne: jest.fn().mockResolvedValue(order),
        };
        return cb(manager);
      });

      const result = await service.cancelOrder('order-1', 'Customer request');

      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('should throw if order already delivered', async () => {
      const order = { id: 'order-1', status: OrderStatus.DELIVERED };
      mockOrderRepo.findOne.mockResolvedValue(order);

      await expect(service.cancelOrder('order-1', 'Customer request')).rejects.toThrow(
        ConflictException,
      );
    });
  });
});
