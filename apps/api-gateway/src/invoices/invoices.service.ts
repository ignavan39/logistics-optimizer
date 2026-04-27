import { Injectable, type OnModuleInit, type OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { type ClientGrpc } from '@nestjs/microservices';

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

export interface PdfUrlResponse {
  url: string;
}

interface InvoiceGrpcClient {
  getInvoice(data: { invoiceId: string }): Promise<InvoiceResponse>;
  getInvoiceByOrder(data: { orderId: string }): Promise<InvoiceResponse>;
  listInvoices(data: ListInvoicesParams): Promise<ListInvoicesResult>;
  updateInvoiceStatus(data: { invoiceId: string; status: string; expectedVersion?: number }): Promise<InvoiceResponse>;
  getInvoicePdfUrl(data: { invoiceId: string }): Promise<PdfUrlResponse>;
}

@Injectable()
export class InvoicesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvoicesService.name);
  private invoiceClient?: InvoiceGrpcClient;

  constructor(
    private configService: ConfigService,
    @Inject('INVOICE_PACKAGE') private invoiceGrpc: ClientGrpc,
  ) {}

  onModuleInit() {
    this.invoiceClient = this.invoiceGrpc.getService<InvoiceGrpcClient>('InvoiceService');
    this.logger.log('InvoicesService initialized');
  }

  onModuleDestroy() {
    this.logger.log('InvoicesService destroyed');
  }

  async getInvoice(id: string): Promise<InvoiceResponse | null> {
    try {
      return await this.invoiceClient.getInvoice({ invoiceId: id });
    } catch (e) {
      this.logger.error(`Failed to get invoice ${id}: ${e}`);
      return null;
    }
  }

  async getInvoiceByOrder(orderId: string): Promise<InvoiceResponse | null> {
    try {
      return await this.invoiceClient.getInvoiceByOrder({ orderId });
    } catch (e) {
      this.logger.error(`Failed to get invoice for order ${orderId}: ${e}`);
      return null;
    }
  }

  async listInvoices(params: ListInvoicesParams = {}): Promise<ListInvoicesResult> {
    try {
      const response = await this.invoiceClient.listInvoices({
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
      return await this.invoiceClient.updateInvoiceStatus({
        invoiceId: id,
        status: status.toUpperCase(),
      });
    } catch (e) {
      this.logger.error(`Failed to update invoice ${id}: ${e}`);
      return null;
    }
  }

  async generateInvoicePdfUrl(invoiceId: string): Promise<PdfUrlResponse | null> {
    try {
      return await this.invoiceClient.getInvoicePdfUrl({ invoiceId });
    } catch (e) {
      this.logger.error(`Failed to get PDF URL for invoice ${invoiceId}: ${e}`);
      return null;
    }
  }
}