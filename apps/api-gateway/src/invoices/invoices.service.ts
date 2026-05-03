import { Injectable, type OnModuleInit, type OnModuleDestroy, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';

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
    @Inject('INVOICE_PACKAGE') private invoiceGrpc: ClientGrpc,
  ) {}

  onModuleInit() {
    this.invoiceClient = this.invoiceGrpc.getService<InvoiceGrpcClient>('InvoiceService');
    this.logger.log('InvoicesService initialized, invoiceClient methods:', Object.keys(this.invoiceClient));
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
      this.logger.debug(`listInvoices called with params: ${JSON.stringify(params)}`);
      const response = await this.invoiceClient.listInvoices({
        counterpartyId: params.counterpartyId,
        status: params.status,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      });
      this.logger.debug(`listInvoices gRPC response: ${JSON.stringify(response.invoices?.[0])}`);
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
      this.logger.log(`generateInvoicePdfUrl called for ${invoiceId}`);
      const result = await this.invoiceClient!.getInvoicePdfUrl({ invoiceId: invoiceId });
      return result;
    } catch (e) {
      const err = e as Error;
      this.logger.error(`Error: ${err.message}`, err.stack);
      return null;
    }
  }
}