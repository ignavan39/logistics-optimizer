import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ClientKafka, ClientGrpc } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { DataSource } from 'typeorm';
import { InvoiceService } from './invoice.service';

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
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.kafka.connect();
    try {
      this.counterpartyClient = this.counterpartyGrpc.getService<CounterpartyServiceClient>('CounterpartyService');
      this.logger.log('InvoiceEventHandler started — listening for order.delivered');
    } catch (e) {
      this.logger.warn('COUNTERPARTY_PACKAGE not available');
    }
  }

  onApplicationShutdown(): void {
    this.logger.log('InvoiceEventHandler stopped');
  }

  async getVatRateFromContract(contractId: string): Promise<number> {
    if (!this.counterpartyClient || !contractId) {
      return 20;
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
    return 20;
  }
}