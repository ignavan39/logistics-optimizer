import { InvoicesService, type InvoiceResponse } from './invoices.service';
import { ConfigService } from '@nestjs/config';

let invoiceClient: any;

const mockGrpcClient = {
  getService: jest.fn().mockImplementation(() => invoiceClient),
};

const mockConfigService = {
  get: jest.fn(),
};

describe('InvoicesService', () => {
  let service: InvoicesService;

  beforeEach(() => {
    jest.clearAllMocks();

    invoiceClient = {
      getInvoice: jest.fn(),
      getInvoiceByOrder: jest.fn(),
      listInvoices: jest.fn(),
      updateInvoiceStatus: jest.fn(),
      getInvoicePdfUrl: jest.fn(),
    };

    service = new InvoicesService(
      mockGrpcClient as any,
    );
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
      invoiceClient.getInvoice.mockResolvedValue(invoice);

      const result = await service.getInvoice('inv-1');

      expect(invoiceClient.getInvoice).toHaveBeenCalledWith({ invoiceId: 'inv-1' });
      expect(result).toEqual(invoice);
    });

    it('should return null on error', async () => {
      invoiceClient.getInvoice.mockRejectedValue(new Error('Not found'));

      const result = await service.getInvoice('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getInvoiceByOrder()', () => {
    it('should return invoice by order id', async () => {
      const invoice: InvoiceResponse = { id: 'inv-1', orderId: 'order-1' } as any;
      invoiceClient.getInvoiceByOrder.mockResolvedValue(invoice);

      const result = await service.getInvoiceByOrder('order-1');

      expect(invoiceClient.getInvoiceByOrder).toHaveBeenCalledWith({ orderId: 'order-1' });
      expect(result).toEqual(invoice);
    });

    it('should return null on error', async () => {
      invoiceClient.getInvoiceByOrder.mockRejectedValue(new Error('Not found'));

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
      invoiceClient.listInvoices.mockResolvedValue(result);

      const response = await service.listInvoices({ page: 1, limit: 20 });

      expect(response).toEqual(result);
    });

    it('should return empty list on error', async () => {
      invoiceClient.listInvoices.mockRejectedValue(new Error('Connection failed'));

      const response = await service.listInvoices();

      expect(response.invoices).toEqual([]);
      expect(response.total).toBe(0);
    });

    it('should use default pagination', async () => {
      invoiceClient.listInvoices.mockResolvedValue({ invoices: [], total: 0, page: 1 });

      await service.listInvoices();

      expect(invoiceClient.listInvoices).toHaveBeenCalledWith({
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
      invoiceClient.updateInvoiceStatus.mockResolvedValue(invoice);

      const result = await service.updateInvoiceStatus('inv-1', 'paid');

      expect(invoiceClient.updateInvoiceStatus).toHaveBeenCalledWith({
        invoiceId: 'inv-1',
        status: 'PAID',
      });
      expect(result).toEqual(invoice);
    });

    it('should update invoice status to cancelled', async () => {
      const invoice = { id: 'inv-1', status: 'CANCELLED' };
      invoiceClient.updateInvoiceStatus.mockResolvedValue(invoice);

      const result = await service.updateInvoiceStatus('inv-1', 'cancelled');

      expect(invoiceClient.updateInvoiceStatus).toHaveBeenCalledWith({
        invoiceId: 'inv-1',
        status: 'CANCELLED',
      });
    });

    it('should return null on error', async () => {
      invoiceClient.updateInvoiceStatus.mockRejectedValue(new Error('Update failed'));

      const result = await service.updateInvoiceStatus('inv-1', 'paid');

      expect(result).toBeNull();
    });
  });

  describe('generateInvoicePdfUrl()', () => {
    it('should return PDF URL from gRPC', async () => {
      const mockResponse = { url: 'http://minio.test/invoices/test.pdf' };
      invoiceClient.getInvoicePdfUrl.mockResolvedValue(mockResponse);

      const result = await service.generateInvoicePdfUrl('inv-1');

      expect(result).toEqual(mockResponse);
      expect(invoiceClient.getInvoicePdfUrl).toHaveBeenCalledWith({ invoiceId: 'inv-1' });
    });

    it('should return null when invoice not found', async () => {
      invoiceClient.getInvoicePdfUrl.mockResolvedValue(null);

      const result = await service.generateInvoicePdfUrl('nonexistent');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      invoiceClient.getInvoicePdfUrl.mockRejectedValue(new Error('Generation failed'));

      const result = await service.generateInvoicePdfUrl('inv-1');

      expect(result).toBeNull();
    });
  });
});
