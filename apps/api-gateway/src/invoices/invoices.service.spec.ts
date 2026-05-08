import { InvoicesService } from './invoices.service';

describe('InvoicesService', () => {
  let service: InvoicesService;
  
  const mockClient = {
    getInvoice: jest.fn(),
    getInvoiceByOrder: jest.fn(),
    listInvoices: jest.fn(),
    updateInvoiceStatus: jest.fn(),
    getInvoicePdfUrl: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.getInvoice.mockReset();
    mockClient.getInvoiceByOrder.mockReset();
    mockClient.listInvoices.mockReset();
    mockClient.updateInvoiceStatus.mockReset();
    mockClient.getInvoicePdfUrl.mockReset();
    
    service = new InvoicesService({} as any);
    (service as any).client = mockClient;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getInvoice()', () => {
    it('should return invoice from gRPC', async () => {
      const rawResponse = { id: 'inv-1', order_id: 'order-1', number: 'INV-001', type: 'standard', amount_rub: 1000, vat_rate: 20, vat_amount: 200, status: 'pending', due_date: '2026-12-31' };
      mockClient.getInvoice.mockImplementation((_opts: any, callback: any) => {
        callback(null, rawResponse);
      });

      const result = await service.getInvoice('inv-1');

      expect(mockClient.getInvoice).toHaveBeenCalledWith({ invoice_id: 'inv-1' }, expect.any(Function));
      expect(result).toMatchObject({ id: 'inv-1', orderId: 'order-1' });
    });

    it('should return null on error', async () => {
      mockClient.getInvoice.mockImplementation((_opts: any, callback: any) => {
        callback(new Error('Not found'), null);
      });

      const result = await service.getInvoice('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getInvoiceByOrder()', () => {
    it('should return invoice by order id', async () => {
      const rawResponse = { id: 'inv-1', order_id: 'order-1' };
      mockClient.getInvoiceByOrder.mockImplementation((_opts: any, callback: any) => {
        callback(null, rawResponse);
      });

      const result = await service.getInvoiceByOrder('order-1');

      expect(mockClient.getInvoiceByOrder).toHaveBeenCalledWith({ order_id: 'order-1' }, expect.any(Function));
      expect(result).toMatchObject({ id: 'inv-1', orderId: 'order-1' });
    });
  });
});
