import { Injectable, type OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { loadPackageDefinition, credentials } from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

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
  counterpartyName?: string;
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

const PROTO_PATH = '/app/libs/proto/src/invoice.proto';
const COUNTERPARTY_PROTO_PATH = '/app/libs/proto/src/counterparty.proto';

@Injectable()
export class InvoicesService implements OnModuleInit {
  private readonly logger = new Logger(InvoicesService.name);
  private client: any;
  private counterpartyClient: any;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    try {
      const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });
      const proto = loadPackageDefinition(packageDefinition) as any;
      
      const InvoiceService = proto.invoice?.InvoiceService;
      if (!InvoiceService) {
        this.logger.error('InvoiceService not found in proto');
        return;
      }
      
      const url = this.configService.get('GRPC_INVOICE_HOST', 'invoice-service:50052');
      this.logger.log(`Connecting to ${url}`);
      
      this.client = new InvoiceService(url, credentials.createInsecure());
      this.client.waitForReady(Date.now() + 5000, (err: any) => {
        if (err) this.logger.error(`gRPC connection error: ${err}`);
        else this.logger.log('gRPC client ready');
      });

      const cpPackageDefinition = protoLoader.loadSync(COUNTERPARTY_PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });
      const cpProto = loadPackageDefinition(cpPackageDefinition) as any;
      const CounterpartyService = cpProto.counterparty?.CounterpartyService;
      
      const cpUrl = this.configService.get('GRPC_COUNTERPARTY_HOST', 'counterparty-service:50057');
      this.counterpartyClient = new CounterpartyService(cpUrl, credentials.createInsecure());
      this.counterpartyClient.waitForReady(Date.now() + 5000, (err: any) => {
        if (err) this.logger.error(`Counterparty gRPC error: ${err}`);
        else this.logger.log('Counterparty gRPC ready');
      });
    } catch (e) {
      this.logger.error(`Failed to init gRPC client: ${e}`);
    }
  }

  async listInvoices(params: ListInvoicesParams = {}): Promise<ListInvoicesResult> {
    if (!this.client) {
      this.logger.error('gRPC client not initialized');
      return { invoices: [], total: 0, page: 1 };
    }
    
    const response: any = await new Promise((resolve) => {
      this.client.listInvoices({
        counterpartyId: params.counterpartyId,
        status: params.status,
        page: (params.page ?? 1) || 1,
        limit: (params.limit ?? 20) || 20,
      }, (err: any, res: any) => {
        if (err) {
          this.logger.error(`listInvoices error: ${err}`);
          resolve(null);
        } else {
          resolve(res);
        }
      });
    });
    
    if (!response) return { invoices: [], total: 0, page: 1 };
        
    const counterpartyIds = [...new Set((response.invoices || []).map((inv: any) => inv.counterparty_id).filter(Boolean))] as string[];
    const counterpartyNames: Record<string, string> = {};
    
    if (counterpartyIds.length > 0 && this.counterpartyClient) {
      const results = await Promise.all(counterpartyIds.map(cpId => 
        new Promise<{ id: string; name: string }>((resolve) => {
          this.counterpartyClient.getCounterparty({ id: cpId }, (err: any, res: any) => {
            resolve(err ? { id: cpId, name: '' } : { id: cpId, name: res?.name || '' });
          });
        })
      ));
      results.forEach(r => { if (r.name) counterpartyNames[r.id] = r.name; });
    }
        
    const invoices = (response.invoices || []).map((inv: any) => ({
      id: String(inv.id || ''),
      orderId: String(inv.order_id || ''),
      number: String(inv.number || ''),
      type: 'INVOICE',
      amountRub: Number(inv.amount) || Number(inv.amount_rub) || 0,
      vatRate: Number(inv.vat_rate) || 0,
      vatAmount: Number(inv.vat_amount) || 0,
      status: String(inv.status || ''),
      dueDate: inv.due_date ? new Date(inv.due_date) : new Date(),
      paidAt: inv.paid_at ? new Date(inv.paid_at) : undefined,
      counterpartyId: inv.counterparty_id ? String(inv.counterparty_id) : undefined,
      counterpartyName: inv.counterparty_id ? counterpartyNames[inv.counterparty_id] : undefined,
      contractId: inv.contract_id ? String(inv.contract_id) : undefined,
      description: inv.description ? String(inv.description) : undefined,
      version: Number(inv.version) || 0,
    }));
        
    return {
      invoices,
      total: response.total || 0,
      page: response.page || 1,
    };
  }

  async getInvoice(id: string): Promise<InvoiceResponse | null> {
    return new Promise((resolve) => {
      if (!this.client) resolve(null);
      this.client.getInvoice({ invoice_id: id }, (err: any, response: any) => {
        if (err || !response) resolve(null);
        resolve({
          id: String(response.id || ''),
          orderId: String(response.order_id || ''),
          number: String(response.number || ''),
          type: 'INVOICE',
          amountRub: Number(response.amount) || 0,
          vatRate: Number(response.vat_rate) || 0,
          vatAmount: Number(response.vat_amount) || 0,
          status: String(response.status || ''),
          dueDate: response.due_date ? new Date(response.due_date) : new Date(),
          paidAt: response.paid_at ? new Date(response.paid_at) : undefined,
          counterpartyId: response.counterparty_id ? String(response.counterparty_id) : undefined,
          contractId: response.contract_id ? String(response.contract_id) : undefined,
          description: response.description ? String(response.description) : undefined,
          version: Number(response.version) || 0,
        });
      });
    });
  }

  async getInvoiceByOrder(orderId: string): Promise<InvoiceResponse | null> {
    return new Promise((resolve) => {
      if (!this.client) resolve(null);
      this.client.getInvoiceByOrder({ order_id: orderId }, (err: any, response: any) => {
        if (err || !response) resolve(null);
        resolve({
          id: String(response.id || ''),
          orderId: String(response.order_id || ''),
          number: String(response.number || ''),
          type: 'INVOICE',
          amountRub: Number(response.amount) || 0,
          vatRate: Number(response.vat_rate) || 0,
          vatAmount: Number(response.vat_amount) || 0,
          status: String(response.status || ''),
          dueDate: response.due_date ? new Date(response.due_date) : new Date(),
          paidAt: response.paid_at ? new Date(response.paid_at) : undefined,
          counterpartyId: response.counterparty_id ? String(response.counterparty_id) : undefined,
          contractId: response.contract_id ? String(response.contract_id) : undefined,
          description: response.description ? String(response.description) : undefined,
          version: Number(response.version) || 0,
        });
      });
    });
  }

  async generateInvoicePdfUrl(invoiceId: string): Promise<PdfUrlResponse | null> {
    return new Promise((resolve) => {
      if (!this.client) resolve(null);
      this.client.getInvoicePdfUrl({ invoice_id: invoiceId }, (err: any, response: any) => {
        if (err || !response) resolve(null);
        resolve({ url: String(response.url || '') });
      });
    });
  }

  async updateInvoiceStatus(id: string, status: 'paid' | 'cancelled'): Promise<InvoiceResponse | null> {
    return new Promise((resolve) => {
      if (!this.client) resolve(null);
      this.client.updateInvoiceStatus({ invoice_id: id, status: status.toUpperCase() }, (err: any, response: any) => {
        if (err || !response) resolve(null);
        resolve({
          id: String(response.id || ''),
          orderId: String(response.order_id || ''),
          number: String(response.number || ''),
          type: 'INVOICE',
          amountRub: Number(response.amount) || 0,
          vatRate: Number(response.vat_rate) || 0,
          vatAmount: Number(response.vat_amount) || 0,
          status: String(response.status || ''),
          dueDate: response.due_date ? new Date(response.due_date) : new Date(),
          paidAt: response.paid_at ? new Date(response.paid_at) : undefined,
          counterpartyId: response.counterparty_id ? String(response.counterparty_id) : undefined,
          contractId: response.contract_id ? String(response.contract_id) : undefined,
          description: response.description ? String(response.description) : undefined,
          version: Number(response.version) || 0,
        });
      });
    });
  }
}