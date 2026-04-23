import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InvoiceEntity, InvoiceStatus, InvoiceType } from './entities/invoice.entity';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepo: Repository<InvoiceEntity>,
  ) {}

  async getInvoiceById(id: string): Promise<InvoiceEntity | null> {
    return this.invoiceRepo.findOne({ where: { id } });
  }

  async getInvoiceByOrderId(orderId: string): Promise<InvoiceEntity | null> {
    return this.invoiceRepo.findOne({ where: { orderId } });
  }

  async findAll(options: {
    counterpartyId?: string;
    status?: InvoiceStatus;
    page?: number;
    limit?: number;
  }): Promise<{ invoices: InvoiceEntity[]; total: number }> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.invoiceRepo.createQueryBuilder('inv');

    if (options.counterpartyId) {
      qb.andWhere('inv.counterparty_id = :counterpartyId', { counterpartyId: options.counterpartyId });
    }
    if (options.status) {
      qb.andWhere('inv.status = :status', { status: options.status });
    }

    const [invoices, total] = await qb
      .orderBy('inv.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { invoices, total };
  }

  async updateStatus(
    id: string,
    status: InvoiceStatus,
    expectedVersion?: number,
  ): Promise<InvoiceEntity> {
    const invoice = await this.getInvoiceById(id);
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    if (expectedVersion !== undefined && invoice.version !== expectedVersion) {
      throw new ConflictException('Version conflict');
    }

    invoice.status = status;
    if (status === InvoiceStatus.PAID) {
      invoice.paidAt = new Date();
    }

    return this.invoiceRepo.save(invoice);
  }

  async createInvoice(data: {
    orderId: string;
    number: string;
    type: InvoiceType;
    amountRub: number;
    vatRate: number;
    vatAmount: number;
    dueDate: Date;
    counterpartyId?: string;
    contractId?: string;
    description?: string;
  }): Promise<InvoiceEntity> {
    const invoice = this.invoiceRepo.create({
      ...data,
      status: InvoiceStatus.DRAFT,
    });
    return this.invoiceRepo.save(invoice);
  }
}