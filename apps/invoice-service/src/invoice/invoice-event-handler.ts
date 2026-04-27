import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ClientKafka, Transport, ClientGrpc } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { IdempotencyGuard } from '@logistics/kafka-utils';
import { InvoiceService } from './invoice.service';
import { InvoiceType } from './entities/invoice.entity';

interface TariffItem {
  vatRate?: number;
}

interface GetContractTariffsResponse {
  items: TariffItem[];
}

interface CounterpartyServiceClient {
  getContractTariffs(request: { contractId: string; zone?: string }): import('rxjs').Observable<GetContractTariffsResponse>;
}

@Injectable()
export class InvoiceEventHandler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(InvoiceEventHandler.name);
  private counterpartyClient?: CounterpartyServiceClient;

  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafka: ClientKafka,
    @Inject('COUNTERPARTY_PACKAGE') private readonly counterpartyGrpc: ClientGrpc,
    private readonly invoiceService: InvoiceService,
    private readonly idempotencyGuard: IdempotencyGuard,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.kafka.connect();
    this.counterpartyClient = this.counterpartyGrpc.getService<CounterpartyServiceClient>('CounterpartyService');
    this.logger.log('InvoiceEventHandler started — listening for order.delivered');
  }

  onApplicationShutdown(): void {
    this.logger.log('InvoiceEventHandler stopped');
  }

  private async getVatRateFromContract(contractId: string): Promise<number> {
    if (!this.counterpartyClient || !contractId) {
      return 20; // default VAT
    }
    
    try {
      const response = await firstValueFrom(
        this.counterpartyClient.getContractTariffs({ contractId })
      );
      
      if (response.items && response.items.length > 0) {
        return response.items[0].vatRate ?? 20;
      }
    } catch (e) {
      this.logger.warn(`Failed to get VAT from contract ${contractId}: ${e}`);
    }
    
    return 20; // fallback to default
  }

  async handleOrderDelivered(event: any): Promise<void> {
    const { orderId, contractId, counterpartyId, tariffSnapshot, originLat, originLng, destinationLat, destinationLng, weightKg } = event;

    const eventId = `order.delivered.${orderId}`;
    const shouldProcess = await this.idempotencyGuard.shouldProcess(eventId, 'order.delivered');
    
    if (!shouldProcess) {
      this.logger.log(`Skipping duplicate order.delivered for order ${orderId}`);
      return;
    }

    this.logger.log(`Processing order.delivered for order ${orderId}`);

    try {
      const invoiceNumber = `INV-${Date.now()}`;
      const vatRate = await this.getVatRateFromContract(contractId);

      // Calculate price using snapshot
      let price = 0;
      if (tariffSnapshot) {
        price = Number(tariffSnapshot.minPrice) || 0;
      }

      const vatAmount = price * (vatRate / 100);
      const totalAmount = price + vatAmount;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      await this.invoiceService.createInvoice({
        orderId,
        number: invoiceNumber,
        type: InvoiceType.INVOICE,
        amountRub: totalAmount,
        vatRate,
        vatAmount,
        dueDate,
        counterpartyId,
        contractId,
        description: `Invoice for order ${orderId.substring(0, 8)}`,
      });

      this.logger.log(`Created invoice ${invoiceNumber} for order ${orderId} with VAT ${vatRate}%`);
    } catch (error) {
      this.logger.error(`Failed to create invoice for order ${orderId}: ${error}`);
      throw error;
    }
  }
}