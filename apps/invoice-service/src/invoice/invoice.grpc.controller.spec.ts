import { Test, TestingModule } from '@nestjs/testing';
import { RpcException } from '@nestjs/microservices';
import { InvoiceGrpcController } from './invoice.grpc.controller';
import { InvoiceService } from './invoice.service';
import { InvoiceStatus, InvoiceType } from './entities/invoice.entity';

describe('InvoiceGrpcController', () => {
  let controller: InvoiceGrpcController;
  let service: InvoiceService;

  const mockService = {
    getInvoiceById: jest.fn(),
    getInvoiceByOrderId: jest.fn(),
    findAll: jest.fn(),
    createInvoice: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockOrderPackage = {
    getService: jest.fn().mockReturnValue({
      GetOrder: jest.fn().mockResolvedValue({ id: 'order-1' }),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoiceGrpcController],
      providers: [
        { provide: 'ORDER_PACKAGE', useValue: mockOrderPackage },
        { provide: InvoiceService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<InvoiceGrpcController>(InvoiceGrpcController);
    service = module.get<InvoiceService>(InvoiceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GetInvoice', () => {
    it('should return invoice', async () => {
      const invoice = {
        id: 'inv-1',
        orderId: 'order-1',
        number: 'INV-001',
        type: InvoiceType.INVOICE,
        amountRub: 1000,
        vatRate: 20,
        vatAmount: 200,
        status: InvoiceStatus.DRAFT,
        dueDate: new Date(),
        createdAt: new Date(),
        version: 1,
      };
      mockService.getInvoiceById.mockResolvedValue(invoice);

      const result = await controller.getInvoice({ invoiceId: 'inv-1' });

      expect(result.id).toBe('inv-1');
      expect(result.orderId).toBe('order-1');
    });

    it('should throw NOT_FOUND if invoice not found', async () => {
      mockService.getInvoiceById.mockResolvedValue(null);

      await expect(controller.getInvoice({ invoiceId: 'nonexistent' })).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('GetInvoiceByOrder', () => {
    it('should return invoice by order id', async () => {
      const invoice = { id: 'inv-1', orderId: 'order-1' };
      mockService.getInvoiceByOrderId.mockResolvedValue(invoice);

      const result = await controller.getInvoiceByOrder({ orderId: 'order-1' });

      expect(result.orderId).toBe('order-1');
    });

    it('should throw NOT_FOUND if not found', async () => {
      mockService.getInvoiceByOrderId.mockResolvedValue(null);

      await expect(controller.getInvoiceByOrder({ orderId: 'nonexistent' })).rejects.toThrow(
        RpcException,
      );
    });
  });

  describe('ListInvoices', () => {
    it('should return paginated list', async () => {
      const invoices = [
        { id: 'inv-1', orderId: 'order-1' },
        { id: 'inv-2', orderId: 'order-2' },
      ];
      mockService.findAll.mockResolvedValue({ invoices, total: 2 });

      const result = await controller.listInvoices({ page: 1, limit: 20 });

      expect(result.invoices).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should handle status filter', async () => {
      mockService.findAll.mockResolvedValue({ invoices: [], total: 0 });

      await controller.listInvoices({ status: 'PAID' });

      expect(mockService.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: InvoiceStatus.PAID }),
      );
    });
  });

  describe('CreateInvoice', () => {
    it('should create invoice', async () => {
      const invoice = {
        id: 'inv-1',
        orderId: 'order-1',
        number: 'INV-001',
        type: InvoiceType.INVOICE,
        amountRub: 1000,
        vatRate: 20,
        vatAmount: 200,
        status: InvoiceStatus.DRAFT,
        dueDate: new Date(),
        createdAt: new Date(),
        version: 1,
      };
      mockService.createInvoice.mockResolvedValue(invoice);

      const result = await controller.createInvoice({
        orderId: 'order-1',
        number: 'INV-001',
        type: 'INVOICE',
        amountRub: 100000,
        vatRate: 2000,
        vatAmount: 20000,
        dueDate: Date.now(),
      });

      expect(result.number).toBe('INV-001');
    });
  });

  describe('UpdateInvoiceStatus', () => {
    it('should update status', async () => {
      const invoice = {
        id: 'inv-1',
        status: InvoiceStatus.PAID,
        orderId: 'order-1',
        number: 'INV-001',
        type: InvoiceType.INVOICE,
        amountRub: 1000,
        vatRate: 20,
        vatAmount: 200,
        dueDate: new Date(),
        createdAt: new Date(),
        version: 2,
      };
      mockService.updateStatus.mockResolvedValue(invoice);

      const result = await controller.updateInvoiceStatus({
        invoiceId: 'inv-1',
        status: 'PAID',
        expectedVersion: 1,
      });

      expect(result.status).toBe(InvoiceStatus.PAID);
    });
  });
});