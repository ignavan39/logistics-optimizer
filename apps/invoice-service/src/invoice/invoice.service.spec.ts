import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InvoiceService } from './invoice.service';
import { InvoiceEntity, InvoiceStatus, InvoiceType } from './entities/invoice.entity';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let repo: Repository<InvoiceEntity>;
  let mockRepo: any;

  beforeEach(() => {
    jest.clearAllMocks();
    global.crypto = { randomUUID: () => 'test-uuid-' + Math.random() } as any;
    mockRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };
  });

  beforeEach(async () => {
    const mockDataSource = {
      getRepository: jest.fn().mockReturnValue(mockRepo),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: getRepositoryToken(InvoiceEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
    repo = module.get<Repository<InvoiceEntity>>(getRepositoryToken(InvoiceEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getInvoiceById', () => {
    it('should return invoice by id', async () => {
      const invoice = { id: 'inv-1', number: 'INV-001' };
      mockRepo.findOne.mockResolvedValue(invoice);

      const result = await service.getInvoiceById('inv-1');

      expect(result).toEqual(invoice);
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'inv-1' } });
    });

    it('should return null if invoice not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.getInvoiceById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getInvoiceByOrderId', () => {
    it('should return invoice by order id', async () => {
      const invoice = { id: 'inv-1', orderId: 'order-1' };
      mockRepo.findOne.mockResolvedValue(invoice);

      const result = await service.getInvoiceByOrderId('order-1');

      expect(result).toEqual(invoice);
    });

    it('should return null if not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.getInvoiceByOrderId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated invoices', async () => {
      const invoices = [
        { id: 'inv-1', status: InvoiceStatus.DRAFT },
        { id: 'inv-2', status: InvoiceStatus.SENT },
      ];
      const mockQb = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([invoices, 2]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by counterpartyId', async () => {
      const mockQb = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ counterpartyId: 'cp-1' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'invoice.counterpartyId = :counterpartyId',
        { counterpartyId: 'cp-1' },
      );
    });

    it('should filter by status', async () => {
      const mockQb = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAll({ status: InvoiceStatus.PAID });

expect(mockQb.andWhere).toHaveBeenCalledWith(
        'invoice.status = :status',
        { status: InvoiceStatus.PAID },
      );
    });
  });

  describe('updateStatus', () => {
    it('should update invoice status', async () => {
      const invoice = { id: 'inv-1', status: InvoiceStatus.DRAFT, version: 1 };
      mockRepo.findOne.mockResolvedValue(invoice);
      mockRepo.save.mockResolvedValue({ ...invoice, status: InvoiceStatus.PAID });

      const result = await service.updateStatus('inv-1', InvoiceStatus.PAID);

      expect(result.status).toBe(InvoiceStatus.PAID);
    });

    it('should set paidAt when status is PAID', async () => {
      const invoice = { id: 'inv-1', status: InvoiceStatus.SENT, version: 1, paidAt: undefined as Date | undefined };
      mockRepo.findOne.mockResolvedValue(invoice);
      mockRepo.save.mockImplementation((entity) => Promise.resolve({ ...invoice, ...entity }));

      const result = await service.updateStatus('inv-1', InvoiceStatus.PAID);

      expect(result.status).toBe(InvoiceStatus.PAID);
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if invoice not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.updateStatus('nonexistent', InvoiceStatus.PAID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException on version mismatch', async () => {
      const invoice = { id: 'inv-1', status: InvoiceStatus.DRAFT, version: 2 };
      mockRepo.findOne.mockResolvedValue(invoice);

      await expect(service.updateStatus('inv-1', InvoiceStatus.PAID, 1)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('createInvoice', () => {
    it('should create invoice with DRAFT status', async () => {
      const data = {
        orderId: 'order-1',
        number: 'INV-001',
        type: InvoiceType.INVOICE,
        amountRub: 1000,
        vatRate: 20,
        vatAmount: 200,
        dueDate: new Date(),
      };
      const created = { id: 'inv-1', ...data, status: InvoiceStatus.DRAFT };
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      const result = await service.createInvoice(data);

      expect(result.status).toBe(InvoiceStatus.DRAFT);
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'order-1' }));
    });
  });
});