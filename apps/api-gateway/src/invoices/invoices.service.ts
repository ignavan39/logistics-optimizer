import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';

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

interface OrderGrpcClient {
  getInvoice(data: { invoiceId: string }): Promise<InvoiceResponse>;
  getInvoiceByOrder(data: { orderId: string }): Promise<InvoiceResponse>;
  listInvoices(data: ListInvoicesParams): Promise<ListInvoicesResult>;
  updateInvoiceStatus(data: { invoiceId: string; status: string; expectedVersion?: number }): Promise<InvoiceResponse>;
}

@Injectable()
export class InvoicesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvoicesService.name);
  private client?: OrderGrpcClient;

  constructor(
    private configService: ConfigService,
    @Inject('ORDER_PACKAGE') private grpcClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.client = this.grpcClient.getService<OrderGrpcClient>('OrderService');
    this.logger.log('InvoicesService initialized');
  }

  onModuleDestroy() {
    this.logger.log('InvoicesService destroyed');
  }

  async getInvoice(id: string): Promise<InvoiceResponse | null> {
    try {
      return await this.client!.getInvoice({ invoiceId: id });
    } catch (e) {
      this.logger.error(`Failed to get invoice ${id}: ${e}`);
      return null;
    }
  }

  async getInvoiceByOrder(orderId: string): Promise<InvoiceResponse | null> {
    try {
      return await this.client!.getInvoiceByOrder({ orderId });
    } catch (e) {
      this.logger.error(`Failed to get invoice for order ${orderId}: ${e}`);
      return null;
    }
  }

  async listInvoices(params: ListInvoicesParams = {}): Promise<ListInvoicesResult> {
    try {
      const response = await this.client!.listInvoices({
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
      return await this.client!.updateInvoiceStatus({
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

      // For now, return null - PDF generation needs @logistics/document-templates
      // This would generate a PDF using the invoice data
      this.logger.log(`Would generate PDF for invoice ${invoiceId}: ${invoice.number}`);
      return null;
    } catch (e) {
      this.logger.error(`Failed to generate PDF for invoice ${invoiceId}: ${e}`);
      return null;
    }
  }
}