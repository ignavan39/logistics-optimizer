import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { generateInvoice } from '@logistics/document-templates';

export interface InvoiceResponse {
  id: string;
  orderId: string;
  number: string;
  type: string;
  amountRub: number;
  vatRate: number;
  vatAmount: number;
  status: string;
  dueDate: Date;
  paidAt?: Date;
  paymentMethod?: string;
  counterpartyId?: string;
  contractId?: string;
  description?: string;
  createdAt?: Date;
  version?: number;
}

export interface ListInvoicesParams {
  counterpartyId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ListInvoicesResult {
  invoices: InvoiceResponse[];
  total: number;
  page: number;
}

export interface OrderResponse {
  id: string;
  originAddress?: string;
  destinationAddress?: string;
}

interface InvoiceGrpcClient {
  getInvoice(data: { invoiceId: string }): Promise<InvoiceResponse>;
  getInvoiceByOrder(data: { orderId: string }): Promise<InvoiceResponse>;
  listInvoices(data: ListInvoicesParams): Promise<ListInvoicesResult>;
  updateInvoiceStatus(data: { invoiceId: string; status: string; expectedVersion?: number }): Promise<InvoiceResponse>;
}

interface OrderGrpcClient {
  getOrder(data: { orderId: string }): Promise<OrderResponse>;
  getCompanySettings(): Promise<{ companyName: string; companyInn: string; companyKpp: string; companyAddress: string; companyPhone: string; companyEmail: string; defaultPaymentTermsDays: number; defaultVatRate: number }>;
}

interface CounterpartyGrpcClient {
  getCounterparty(data: { id: string }): Promise<any>;
}

@Injectable()
export class InvoicesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvoicesService.name);
  private invoiceClient?: InvoiceGrpcClient;
  private orderClient?: OrderGrpcClient;
  private counterpartyClient?: CounterpartyGrpcClient;

  constructor(
    private configService: ConfigService,
    @Inject('INVOICE_PACKAGE') private invoiceGrpc: ClientGrpc,
    @Inject('ORDER_PACKAGE') private orderGrpc: ClientGrpc,
    @Inject('COUNTERPARTY_PACKAGE') private counterpartyGrpc: ClientGrpc,
  ) {}

  onModuleInit() {
    this.invoiceClient = this.invoiceGrpc.getService<InvoiceGrpcClient>('InvoiceService');
    this.orderClient = this.orderGrpc.getService<OrderGrpcClient>('OrderService');
    try {
      this.counterpartyClient = this.counterpartyGrpc.getService<CounterpartyGrpcClient>('CounterpartyService');
    } catch (e) {
      this.logger.warn('Counterparty service not available');
    }
    this.logger.log('InvoicesService initialized');
  }

  onModuleDestroy() {
    this.logger.log('InvoicesService destroyed');
  }

  async getInvoice(id: string): Promise<InvoiceResponse | null> {
    try {
      return await this.invoiceClient!.getInvoice({ invoiceId: id });
    } catch (e) {
      this.logger.error(`Failed to get invoice ${id}: ${e}`);
      return null;
    }
  }

  async getInvoiceByOrder(orderId: string): Promise<InvoiceResponse | null> {
    try {
      return await this.invoiceClient!.getInvoiceByOrder({ orderId });
    } catch (e) {
      this.logger.error(`Failed to get invoice for order ${orderId}: ${e}`);
      return null;
    }
  }

  async listInvoices(params: ListInvoicesParams = {}): Promise<ListInvoicesResult> {
    try {
      const response = await this.invoiceClient!.listInvoices({
        counterpartyId: params.counterpartyId,
        status: params.status,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      });
      return response;
    } catch (e) {
      this.logger.error(`Failed to list invoices: ${e}`);
      return { invoices: [], total: 0, page: 1 };
    }
  }

  async updateInvoiceStatus(
    id: string,
    status: 'paid' | 'cancelled',
  ): Promise<InvoiceResponse | null> {
    try {
      return await this.invoiceClient!.updateInvoiceStatus({
        invoiceId: id,
        status: status.toUpperCase(),
      });
    } catch (e) {
      this.logger.error(`Failed to update invoice ${id}: ${e}`);
      return null;
    }
  }

  async generateInvoicePdf(invoiceId: string): Promise<Buffer | null> {
    try {
      const invoice = await this.getInvoice(invoiceId);
      if (!invoice) {
        return null;
      }

      const order = await this.orderClient!.getOrder({ orderId: invoice.orderId });
      if (!order) {
        return null;
      }

      let buyer: any = null;
      if (invoice.counterpartyId && this.counterpartyClient) {
        try {
          buyer = await this.counterpartyClient.getCounterparty({ id: invoice.counterpartyId });
        } catch (e) {
          this.logger.warn(`Failed to get counterparty: ${e}`);
        }
      }

      let companySettings = {
        companyName: 'ООО "Логистическая Компания"',
        companyInn: '7712345678',
        companyKpp: '771201001',
        companyAddress: 'г. Москва, ул. Примерная, д. 1',
        companyPhone: '+7 (495) 123-45-67',
        companyEmail: 'info@example.ru',
        defaultPaymentTermsDays: 30,
        defaultVatRate: 20,
      };
      try {
        companySettings = await this.orderClient!.getCompanySettings();
      } catch (e) {
        this.logger.warn(`Failed to get company settings: ${e}`);
      }

      const invoiceData = {
        number: invoice.number,
        date: invoice.createdAt ? new Date(invoice.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        seller: {
          name: companySettings.companyName,
          inn: companySettings.companyInn,
          kpp: companySettings.companyKpp,
          address: companySettings.companyAddress,
          phone: companySettings.companyPhone,
        },
        buyer: buyer ? {
          name: buyer.name,
          inn: buyer.inn,
          kpp: buyer.kpp,
          address: buyer.address?.full || 'N/A',
        } : {
          name: 'Customer',
          inn: '0000000000',
          address: order.destinationAddress || 'N/A',
        },
        items: [{
          name: `Доставка заказа ${invoice.orderId.substring(0, 8)}`,
          quantity: 1,
          price: Number(invoice.amountRub) - Number(invoice.vatAmount),
          total: Number(invoice.amountRub) - Number(invoice.vatAmount),
          vat: 0,
        }],
        subtotal: Number(invoice.amountRub) - Number(invoice.vatAmount),
        vatRate: invoice.vatRate,
        vatAmount: invoice.vatAmount,
        total: invoice.amountRub,
        paymentTerms: `${companySettings.defaultPaymentTermsDays} дней`,
      };

      const pdf = await generateInvoice(invoiceData);
      return Buffer.from(pdf);
    } catch (e) {
      this.logger.error(`Failed to generate PDF for invoice ${invoiceId}: ${e}`);
      return null;
    }
  }
}