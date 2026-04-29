import { Controller, Logger, Inject, Optional } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { InvoiceService } from './invoice.service';
import { PdfService } from './pdf.service';
import { InvoiceEntity, InvoiceStatus, InvoiceType } from './entities/invoice.entity';

interface OrderGrpcClient {
  GetOrder(data: { orderId: string }): Promise<any>;
}

interface GetInvoiceRequest {
  invoiceId: string;
}

interface GetInvoiceByOrderRequest {
  orderId: string;
}

interface ListInvoicesRequest {
  counterpartyId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

interface CreateInvoiceRequest {
  orderId: string;
  number: string;
  type: string;
  amountRub: number;
  vatRate: number;
  vatAmount: number;
  dueDate: number;
  counterpartyId?: string;
  contractId?: string;
  description?: string;
}

interface UpdateInvoiceStatusRequest {
  invoiceId: string;
  status: string;
  expectedVersion?: number;
}

interface GetInvoicePdfUrlRequest {
  invoiceId: string;
}

@Controller()
export class InvoiceGrpcController {
  private readonly logger = new Logger(InvoiceGrpcController.name);
  private orderClient?: OrderGrpcClient;

  constructor(
    @Inject('ORDER_PACKAGE') @Optional() private orderPackage: any,
    private readonly invoiceService: InvoiceService,
    private readonly pdfService: PdfService,
  ) {}

  onModuleInit() {
    if (this.orderPackage) {
      this.orderClient = this.orderPackage.getService('OrderService');
    }
  }

  @GrpcMethod('InvoiceService', 'GetInvoice')
  async getInvoice(data: GetInvoiceRequest) {
    const invoice = await this.invoiceService.getInvoiceById(data.invoiceId);
    if (!invoice) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Invoice not found',
      });
    }
    return this.toResponse(invoice);
  }

  @GrpcMethod('InvoiceService', 'GetInvoiceByOrder')
  async getInvoiceByOrder(data: GetInvoiceByOrderRequest) {
    const invoice = await this.invoiceService.getInvoiceByOrderId(data.orderId);
    if (!invoice) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Invoice not found for this order',
      });
    }
    return this.toResponse(invoice);
  }

  @GrpcMethod('InvoiceService', 'ListInvoices')
  async listInvoices(data: ListInvoicesRequest) {
    const status = data.status ? InvoiceStatus[data.status as keyof typeof InvoiceStatus] : undefined;
    const { items, total } = await this.invoiceService.findAll({
      counterpartyId: data.counterpartyId,
      status,
      page: data.page,
      limit: data.limit,
    });
    return {
      invoices: items.map(this.toResponse),
      total,
      page: data.page || 1,
    };
  }

  @GrpcMethod('InvoiceService', 'CreateInvoice')
  async createInvoice(data: CreateInvoiceRequest) {
    try {
      const invoice = await this.invoiceService.createInvoice({
        orderId: data.orderId,
        number: data.number,
        type: InvoiceType[data.type as keyof typeof InvoiceType] || InvoiceType.INVOICE,
        amountRub: data.amountRub,
        vatRate: data.vatRate,
        vatAmount: data.vatAmount,
        dueDate: new Date(data.dueDate),
        counterpartyId: data.counterpartyId,
        contractId: data.contractId,
        description: data.description,
      });
      return this.toResponse(invoice);
    } catch (e) {
      if (e instanceof Error) {
        throw new RpcException({
          code: GrpcStatus.INTERNAL,
          message: e.message,
        });
      }
      throw e;
    }
  }

  @GrpcMethod('InvoiceService', 'UpdateInvoiceStatus')
  async updateInvoiceStatus(data: UpdateInvoiceStatusRequest) {
    try {
      const status = InvoiceStatus[data.status as keyof typeof InvoiceStatus];
      const invoice = await this.invoiceService.updateStatus(
        data.invoiceId,
        status,
        data.expectedVersion,
      );
      return this.toResponse(invoice);
    } catch (e) {
      if (e instanceof Error) {
        throw new RpcException({
          code: GrpcStatus.INTERNAL,
          message: e.message,
        });
      }
      throw e;
    }
  }

  @GrpcMethod('InvoiceService', 'GetInvoicePdfUrl')
  async getInvoicePdfUrl(data: GetInvoicePdfUrlRequest) {
    try {
      const url = await this.pdfService.getOrGeneratePdf(data.invoiceId);
      return { url };
    } catch (e) {
      if (e instanceof Error) {
        throw new RpcException({
          code: GrpcStatus.NOT_FOUND,
          message: e.message,
        });
      }
      throw e;
    }
  }

  private toResponse(invoice: InvoiceEntity) {
    return {
      id: invoice.id,
      orderId: invoice.orderId,
      number: invoice.number,
      type: invoice.type,
      amountRub: Number(invoice.amountRub) * 100,
      vatRate: Number(invoice.vatRate),
      vatAmount: Number(invoice.vatAmount) * 100,
      status: invoice.status,
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).getTime() : 0,
      paidAt: invoice.paidAt ? new Date(invoice.paidAt).getTime() : 0,
      counterpartyId: invoice.counterpartyId ?? '',
      contractId: invoice.contractId ?? '',
      description: invoice.description ?? '',
      createdAt: invoice.createdAt ? new Date(invoice.createdAt).getTime() : 0,
      version: invoice.version,
    };
  }
}