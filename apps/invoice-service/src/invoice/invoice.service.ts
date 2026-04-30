import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Inject } from '@nestjs/common';
import { InvoiceEntity, InvoiceStatus, type InvoiceType } from './entities/invoice.entity';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    @Inject('INVOICE_REPOSITORY') private invoiceRepo: Repository<InvoiceEntity>,
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
    offset?: number;
  } = {}): Promise<{ items: InvoiceEntity[]; total: number }> {
    const { counterpartyId, status, page = 1, limit = 50, offset = 0 } = options;
    
    const qb = this.invoiceRepo.createQueryBuilder('invoice');
    
    if (counterpartyId) {
      qb.andWhere('invoice.counterpartyId = :counterpartyId', { counterpartyId });
    }
    
    if (status) {
      qb.andWhere('invoice.status = :status', { status });
    }
    
    const [items, total] = await qb
      .orderBy('invoice.createdAt', 'DESC')
      .skip((page - 1) * limit + offset)
      .take(limit)
      .getManyAndCount();
    
    this.logger.debug(`findAll: first item amount_rub type = ${typeof items[0]?.amountRub}, value = ${items[0]?.amountRub}`);
    return { items, total };
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
    const existing = await this.getInvoiceByOrderId(data.orderId);
    
    if (existing) {
      throw new ConflictException(`Invoice for order ${data.orderId} already exists`);
    }
    
    const invoice = this.invoiceRepo.create({
      id: crypto.randomUUID(),
      orderId: data.orderId,
      number: data.number,
      type: data.type,
      amountRub: data.amountRub,
      vatRate: data.vatRate,
      vatAmount: data.vatAmount,
      status: InvoiceStatus.DRAFT,
      dueDate: data.dueDate,
      counterpartyId: data.counterpartyId,
      contractId: data.contractId,
      description: data.description,
    });
    
    return this.invoiceRepo.save(invoice);
  }

  async markAsPaid(id: string, paidAt: Date = new Date(), paymentMethod?: string): Promise<InvoiceEntity> {
    const invoice = await this.getInvoiceById(id);
    
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }
    
    if (invoice.status === InvoiceStatus.PAID) {
      return invoice; // already paid
    }
    
    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = paidAt;
    invoice.paymentMethod = paymentMethod;
    invoice.version += 1;
    
    return this.invoiceRepo.save(invoice);
  }

  async updateStatus(id: string, status: InvoiceStatus, expectedVersion?: number): Promise<InvoiceEntity> {
    const invoice = await this.getInvoiceById(id);
    
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    if (expectedVersion !== undefined && invoice.version !== expectedVersion) {
      throw new ConflictException(`Version mismatch: expected ${expectedVersion}, got ${invoice.version}`);
    }
    
    invoice.status = status;
    invoice.version += 1;
    
    return this.invoiceRepo.save(invoice);
  }
}