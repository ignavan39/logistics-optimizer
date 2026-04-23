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

interface OrderGrpcClient {
  getOrder(data: { order_id: string }): Promise<any>;
}

@Injectable()
export class InvoicesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InvoicesService.name);
  private orderClient?: OrderGrpcClient;

  constructor(
    private configService: ConfigService,
    @Inject('ORDER_PACKAGE') private grpcClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.orderClient = this.grpcClient.getService<OrderGrpcClient>('OrderService');
    this.logger.log('InvoicesService initialized');
  }

  onModuleDestroy() {
    this.logger.log('InvoicesService destroyed');
  }

  async getInvoiceByOrder(orderId: string): Promise<InvoiceResponse | null> {
    this.logger.log(`Getting invoice for order ${orderId}`);
    return null;
  }

  async getInvoice(id: string): Promise<InvoiceResponse | null> {
    this.logger.log(`Getting invoice ${id}`);
    return null;
  }

  async generateInvoicePdf(invoiceId: string): Promise<Buffer | null> {
    this.logger.log(`Generating PDF for invoice ${invoiceId}`);
    return null;
  }

  async updateInvoiceStatus(
    id: string,
    status: 'paid' | 'cancelled',
  ): Promise<InvoiceResponse | null> {
    this.logger.log(`Updating invoice ${id} to status ${status}`);
    return null;
  }
}