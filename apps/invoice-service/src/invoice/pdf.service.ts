import { Injectable, Logger, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { PdfStatus } from './entities/invoice.entity';
import { S3StorageService } from './s3-storage.service';
import { PgAdvisoryLock } from './pg-advisory-lock';
import { generateInvoice, type InvoiceData } from '@logistics/document-templates';
import { firstValueFrom } from 'rxjs';

interface OrderServiceClient {
  GetOrder(request: { order_id: string }): import('rxjs').Observable<any>;
  GetCompanySettings(request: Record<string, never>): import('rxjs').Observable<any>;
}

interface CounterpartyServiceClient {
  GetCounterparty(request: { id: string }): import('rxjs').Observable<any>;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);
  private readonly lock: PgAdvisoryLock;
  private readonly pollInterval = 500;
  private readonly pollTimeout = 30000;

  private orderClient!: OrderServiceClient;
  private counterpartyClient!: CounterpartyServiceClient;

  constructor(
    private readonly dataSource: DataSource,
    private readonly s3Storage: S3StorageService,
    private readonly configService: ConfigService,
    @Inject('ORDER_PACKAGE') private readonly orderGrpc: ClientGrpc,
    @Inject('COUNTERPARTY_PACKAGE') private readonly counterpartyGrpc: ClientGrpc,
  ) {
    this.lock = new PgAdvisoryLock(this.dataSource);
    this.orderClient = this.orderGrpc.getService<OrderServiceClient>('OrderService');
    this.counterpartyClient = this.counterpartyGrpc.getService<CounterpartyServiceClient>('CounterpartyService');
  }

  async getOrGeneratePdf(invoiceId: string): Promise<string> {
    const lockKey = `pdf:${invoiceId}`;

    const existing = await this.getExistingPdf(invoiceId);
    if (existing) {
      return existing;
    }

    const result = await this.lock.withLock(lockKey, async () => {
      const fresh = await this.getExistingPdf(invoiceId);
      if (fresh) {
        return fresh;
      }

      return this.generateAndUpload(invoiceId);
    });

    if (!result) {
      throw new ConflictException('PDF generation is in progress by another request');
    }

    return result;
  }

  private async getExistingPdf(invoiceId: string): Promise<string | null> {
    const invoice = await this.dataSource.query(
      `SELECT id, pdf_url, pdf_status FROM invoice WHERE id = $1`,
      [invoiceId],
    );

    if (!invoice[0]) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    const { pdf_url, pdf_status } = invoice[0];

    if (pdf_status === PdfStatus.READY && pdf_url) {
      return pdf_url;
    }

    if (pdf_status === PdfStatus.GENERATING) {
      return this.waitForGeneration(invoiceId);
    }

    return null;
  }

  private async waitForGeneration(invoiceId: string): Promise<string | null> {
    const start = Date.now();

    while (Date.now() - start < this.pollTimeout) {
      await this.sleep(this.pollInterval);

      const invoice = await this.dataSource.query(
        `SELECT pdf_url, pdf_status FROM invoice WHERE id = $1`,
        [invoiceId],
      );

      if (!invoice[0]) {
        return null;
      }

      if (invoice[0].pdf_status === PdfStatus.READY && invoice[0].pdf_url) {
        return invoice[0].pdf_url;
      }

      if (invoice[0].pdf_status === PdfStatus.FAILED) {
        return null;
      }
    }

    return null;
  }

  private async generateAndUpload(invoiceId: string): Promise<string> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      await queryRunner.startTransaction();

      const invoiceResult = await queryRunner.query(
        `SELECT * FROM invoice WHERE id = $1 FOR UPDATE`,
        [invoiceId],
      );

      if (!invoiceResult[0]) {
        throw new NotFoundException(`Invoice ${invoiceId} not found`);
      }

      const invoice = invoiceResult[0];

      await queryRunner.query(
        `UPDATE invoice SET pdf_status = $1, updated_at = NOW() WHERE id = $2`,
        [PdfStatus.GENERATING, invoiceId],
      );

      await queryRunner.commitTransaction();

      const [order, companySettings, counterparty] = await Promise.all([
        this.getOrderData(invoice.order_id),
        this.getCompanySettings(),
        invoice.counterparty_id ? this.getCounterpartyData(invoice.counterparty_id) : null,
      ]);

      const pdfData = this.buildInvoiceData(invoice, order, companySettings, counterparty);
      const pdfBuffer = Buffer.from(await generateInvoice(pdfData));

      const s3Key = this.s3Storage.generateKey(invoiceId);
      const url = await this.s3Storage.upload(s3Key, pdfBuffer);

      await this.dataSource.query(
        `UPDATE invoice SET pdf_url = $1, pdf_status = $2, pdf_generated_at = NOW(), updated_at = NOW() WHERE id = $3`,
        [url, PdfStatus.READY, invoiceId],
      );

      this.logger.log(`PDF generated for invoice ${invoiceId}: ${url}`);
      return url;

    } catch (error) {
      await queryRunner.rollbackTransaction();

      await this.dataSource.query(
        `UPDATE invoice SET pdf_status = $1, updated_at = NOW() WHERE id = $2`,
        [PdfStatus.FAILED, invoiceId],
      );

      this.logger.error(`Failed to generate PDF for invoice ${invoiceId}`, error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async getOrderData(orderId: string): Promise<any> {
    try {
      const order = await firstValueFrom(this.orderClient.GetOrder({ order_id: orderId }));
      return order;
    } catch (error) {
      this.logger.warn(`Failed to get order ${orderId} via gRPC`, error);
      return null;
    }
  }

  private async getCompanySettings(): Promise<any> {
    try {
      const settings = await firstValueFrom(this.orderClient.GetCompanySettings({}));
      return settings;
    } catch (error) {
      this.logger.warn('Failed to get company settings via gRPC', error);
      return null;
    }
  }

  private async getCounterpartyData(counterpartyId: string): Promise<any> {
    try {
      const counterparty = await firstValueFrom(this.counterpartyClient.GetCounterparty({ id: counterpartyId }));
      return counterparty;
    } catch (error) {
      this.logger.warn(`Failed to get counterparty ${counterpartyId} via gRPC`, error);
      return null;
    }
  }

  private buildInvoiceData(invoice: any, order: any, companySettings: any, counterparty: any): InvoiceData {
    const originAddress = order?.origin?.address || '';
    const destinationAddress = order?.destination?.address || '';
    const amountRub = Number(invoice.amount_rub);
    const vatAmount = Number(invoice.vat_amount);
    const subtotal = amountRub - vatAmount;

    return {
      number: invoice.number,
      date: new Date(invoice.created_at).toLocaleDateString('ru-RU'),
      dueDate: new Date(invoice.due_date).toLocaleDateString('ru-RU'),
      seller: {
        name: companySettings?.company_name || 'ООО "Логистик"',
        inn: companySettings?.company_inn || '0000000000',
        kpp: companySettings?.company_kpp,
        address: companySettings?.company_address || 'Адрес не указан',
      },
      buyer: {
        name: counterparty?.name || 'Неизвестный покупатель',
        inn: counterparty?.inn || '0000000000',
        kpp: counterparty?.kpp,
        address: counterparty?.address?.full || destinationAddress || 'Адрес не указан',
      },
      items: [
        {
          name: `Грузоперевозка: ${originAddress} → ${destinationAddress}`,
          quantity: 1,
          price: subtotal,
          total: subtotal,
          vat: vatAmount,
        },
      ],
      subtotal,
      vatRate: Number(invoice.vat_rate),
      vatAmount: vatAmount,
      total: amountRub,
      paymentTerms: `В течение ${companySettings?.default_payment_terms_days || 30} дней`,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}