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
    };

    mockCounterpartyClient = {
      getCounterparty: jest.fn(),
    };

    const mockGrpcClient = {
      getService: jest.fn().mockImplementation((name: string) => {
        if (name === 'OrderService') return mockClient;
        if (name === 'CounterpartyService') return mockCounterpartyClient;
        return {};
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: ConfigService, useValue: mockConfigService },
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

  describe('generateInvoicePdf()', () => {
    const mockInvoice: InvoiceResponse = {
      id: 'inv-1',
      orderId: 'order-1',
      number: 'INV-001',
      type: 'standard',
      amountRub: 12000,
      vatRate: 20,
      vatAmount: 2000,
      status: 'ISSUED',
      dueDate: new Date('2024-02-15'),
      counterpartyId: 'cp-1',
      createdAt: new Date('2024-01-15'),
    };

    const mockOrder = {
      id: 'order-1',
      destinationAddress: 'г. Санкт-Петербург, Невский пр., д. 10',
    };

    const mockSettings = {
      companyName: 'ООО "Тест"',
      companyInn: '1234567890',
      companyKpp: '123456789',
      companyAddress: 'Москва',
      companyPhone: '+7 123 456-78-90',
      companyEmail: 'test@example.com',
      defaultPaymentTermsDays: 30,
      defaultVatRate: 20,
    };

    const mockCounterparty = {
      id: 'cp-1',
      name: 'ООО "Покупатель"',
      inn: '9876543210',
      kpp: '987654321',
      address: { full: 'Санкт-Петербург' },
    };

    it('should generate PDF with company settings and counterparty', async () => {
      mockClient.getInvoice.mockResolvedValue(mockInvoice);
      mockClient.getOrder.mockResolvedValue(mockOrder);
      mockClient.getCompanySettings.mockResolvedValue(mockSettings);
      mockCounterpartyClient.getCounterparty.mockResolvedValue(mockCounterparty);

      const result = await service.generateInvoicePdf('inv-1');

      expect(result).toBeInstanceOf(Buffer);
      expect(result!.length).toBeGreaterThan(0);
    });

    it('should return null when invoice not found', async () => {
      mockClient.getInvoice.mockResolvedValue(null);

      const result = await service.generateInvoicePdf('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null when order not found', async () => {
      mockClient.getInvoice.mockResolvedValue(mockInvoice);
      mockClient.getOrder.mockResolvedValue(null);

      const result = await service.generateInvoicePdf('inv-1');

      expect(result).toBeNull();
    });

    it('should use fallback settings when gRPC fails', async () => {
      mockClient.getInvoice.mockResolvedValue(mockInvoice);
      mockClient.getOrder.mockResolvedValue(mockOrder);
      mockClient.getCompanySettings.mockRejectedValue(new Error('Connection failed'));

      const result = await service.generateInvoicePdf('inv-1');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should generate PDF without counterparty', async () => {
      const invoiceWithoutCp = { ...mockInvoice, counterpartyId: undefined };
      mockClient.getInvoice.mockResolvedValue(invoiceWithoutCp);
      mockClient.getOrder.mockResolvedValue(mockOrder);
      mockClient.getCompanySettings.mockResolvedValue(mockSettings);

      const result = await service.generateInvoicePdf('inv-1');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should use buyer from counterparty when available', async () => {
      mockClient.getInvoice.mockResolvedValue(mockInvoice);
      mockClient.getOrder.mockResolvedValue(mockOrder);
      mockClient.getCompanySettings.mockResolvedValue(mockSettings);
      mockCounterpartyClient.getCounterparty.mockResolvedValue(mockCounterparty);

      const result = await service.generateInvoicePdf('inv-1');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should return null on error', async () => {
      mockClient.getInvoice.mockRejectedValue(new Error('Generation failed'));

      const result = await service.generateInvoicePdf('inv-1');

      expect(result).toBeNull();
    });
  });
});