import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { InvoicesService, InvoiceResponse } from './invoices.service';

const mockConfigService = {
  get: jest.fn(),
};

describe('InvoicesService', () => {
  let service: InvoicesService;
  let mockClient: any;
  let mockCounterpartyClient: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockClient = {
      getInvoice: jest.fn(),
      getInvoiceByOrder: jest.fn(),
      listInvoices: jest.fn(),
      updateInvoiceStatus: jest.fn(),
      getOrder: jest.fn(),
      getCompanySettings: jest.fn(),
      getInvoicePdfUrl: jest.fn(),
    };

    mockCounterpartyClient = {
      getCounterparty: jest.fn(),
    };

    const mockGrpcClient = {
      getService: jest.fn().mockImplementation((name: string) => {
        if (name === 'InvoiceService') return mockClient;
        if (name === 'OrderService') return mockClient;
        if (name === 'CounterpartyService') return mockCounterpartyClient;
        return {};
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'INVOICE_PACKAGE', useValue: mockGrpcClient },
        { provide: 'ORDER_PACKAGE', useValue: mockGrpcClient },
        { provide: 'COUNTERPARTY_PACKAGE', useValue: mockGrpcClient },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getInvoice()', () => {
    it('should return invoice from gRPC', async () => {
      const invoice: InvoiceResponse = {
        id: 'inv-1',
        orderId: 'order-1',
        number: 'INV-001',
        type: 'standard',
        amountRub: 10000,
        vatRate: 20,
        vatAmount: 2000,
        status: 'DRAFT',
        dueDate: new Date(),
      };
      mockClient.getInvoice.mockResolvedValue(invoice);

      const result = await service.getInvoice('inv-1');

      expect(mockClient.getInvoice).toHaveBeenCalledWith({ invoiceId: 'inv-1' });
      expect(result).toEqual(invoice);
    });

    it('should return null on error', async () => {
      mockClient.getInvoice.mockRejectedValue(new Error('Not found'));

      const result = await service.getInvoice('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getInvoiceByOrder()', () => {
    it('should return invoice by order id', async () => {
      const invoice: InvoiceResponse = { id: 'inv-1', orderId: 'order-1' } as any;
      mockClient.getInvoiceByOrder.mockResolvedValue(invoice);

      const result = await service.getInvoiceByOrder('order-1');

      expect(mockClient.getInvoiceByOrder).toHaveBeenCalledWith({ orderId: 'order-1' });
      expect(result).toEqual(invoice);
    });

    it('should return null on error', async () => {
      mockClient.getInvoiceByOrder.mockRejectedValue(new Error('Not found'));

      const result = await service.getInvoiceByOrder('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listInvoices()', () => {
    it('should return list of invoices', async () => {
      const result = {
        invoices: [{ id: 'inv-1' }, { id: 'inv-2' }] as InvoiceResponse[],
        total: 2,
        page: 1,
      };
      mockClient.listInvoices.mockResolvedValue(result);

      const response = await service.listInvoices({ page: 1, limit: 20 });

      expect(response).toEqual(result);
    });

    it('should return empty list on error', async () => {
      mockClient.listInvoices.mockRejectedValue(new Error('Connection failed'));

      const response = await service.listInvoices();

      expect(response.invoices).toEqual([]);
      expect(response.total).toBe(0);
    });

    it('should use default pagination', async () => {
      mockClient.listInvoices.mockResolvedValue({ invoices: [], total: 0, page: 1 });

      await service.listInvoices();

      expect(mockClient.listInvoices).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        counterpartyId: undefined,
        status: undefined,
      });
    });
  });

  describe('updateInvoiceStatus()', () => {
    it('should update invoice status to paid', async () => {
      const invoice = { id: 'inv-1', status: 'PAID' };
      mockClient.updateInvoiceStatus.mockResolvedValue(invoice);

      const result = await service.updateInvoiceStatus('inv-1', 'paid');

      expect(mockClient.updateInvoiceStatus).toHaveBeenCalledWith({
        invoiceId: 'inv-1',
        status: 'PAID',
      });
      expect(result).toEqual(invoice);
    });

    it('should update invoice status to cancelled', async () => {
      const invoice = { id: 'inv-1', status: 'CANCELLED' };
      mockClient.updateInvoiceStatus.mockResolvedValue(invoice);

      const result = await service.updateInvoiceStatus('inv-1', 'cancelled');

      expect(mockClient.updateInvoiceStatus).toHaveBeenCalledWith({
        invoiceId: 'inv-1',
        status: 'CANCELLED',
      });
    });

    it('should return null on error', async () => {
      mockClient.updateInvoiceStatus.mockRejectedValue(new Error('Update failed'));

      const result = await service.updateInvoiceStatus('inv-1', 'paid');

      expect(result).toBeNull();
    });
  });

  describe('generateInvoicePdfUrl()', () => {
    it('should return PDF URL from gRPC', async () => {
      const mockResponse = { url: 'http://minio.test/invoices/test.pdf' };
      mockClient.getInvoicePdfUrl.mockResolvedValue(mockResponse);

      const result = await service.generateInvoicePdfUrl('inv-1');

      expect(result).toEqual(mockResponse);
      expect(mockClient.getInvoicePdfUrl).toHaveBeenCalledWith({ invoiceId: 'inv-1' });
    });

    it('should return null when invoice not found', async () => {
      mockClient.getInvoicePdfUrl.mockResolvedValue(null);

      const result = await service.generateInvoicePdfUrl('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockClient.getInvoicePdfUrl.mockRejectedValue(new Error('Generation failed'));

      const result = await service.generateInvoicePdfUrl('inv-1');

      expect(result).toBeNull();
    });
  });
});