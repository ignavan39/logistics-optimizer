import { Controller, Logger, Inject } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { InvoiceService } from './invoice.service';
import { InvoiceStatus, InvoiceType } from './entities/invoice.entity';

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

interface UpdateInvoiceStatusRequest {
  invoiceId: string;
  status: string;
  expectedVersion?: number;
}

@Controller()
export class InvoiceGrpcController {
  private readonly logger = new Logger(InvoiceGrpcController.name);

  constructor(@Inject(InvoiceService) private readonly invoiceService: InvoiceService) {}

  @GrpcMethod('OrderService', 'GetInvoice')
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

  @GrpcMethod('OrderService', 'GetInvoiceByOrder')
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

  @GrpcMethod('OrderService', 'ListInvoices')
  async listInvoices(data: ListInvoicesRequest) {
    const status = data.status ? InvoiceStatus[data.status as keyof typeof InvoiceStatus] : undefined;
    const { invoices, total } = await this.invoiceService.findAll({
      counterpartyId: data.counterpartyId,
      status,
      page: data.page,
      limit: data.limit,
    });
    return {
      invoices: invoices.map(this.toResponse),
      total,
      page: data.page || 1,
    };
  }

  @GrpcMethod('OrderService', 'UpdateInvoiceStatus')
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

  private toResponse(invoice: any) {
    return {
      id: invoice.id,
      orderId: invoice.orderId,
      number: invoice.number,
      type: invoice.type,
      amountRub: Number(invoice.amountRub) * 100,
      vatRate: Number(invoice.vatRate),
      vatAmount: Number(invoice.vatAmount) * 100,
      status: invoice.status,
      dueDate: invoice.dueDate?.getTime() ?? 0,
      paidAt: invoice.paidAt?.getTime() ?? 0,
      counterpartyId: invoice.counterpartyId ?? '',
      contractId: invoice.contractId ?? '',
      createdAt: invoice.createdAt?.getTime() ?? 0,
      version: invoice.version,
    };
  }
}