import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import {
  type GetContractTariffsDto,
  type CounterpartyResponse,
  type ContractTariffResponse,
  type ContractResponse,
  type ValidateContractResponse,
} from './dto/counterparty.dto';

interface CounterpartyGrpcClient {
  getCounterparty(data: { id: string }, metadata?: Metadata): Promise<CounterpartyResponse>;
  getContractTariffs(data: GetContractTariffsDto, metadata?: Metadata): Promise<{ items: ContractTariffResponse[] }>;
  getContract(data: { id: string }, metadata?: Metadata): Promise<ContractResponse>;
}

@Injectable()
export class CounterpartyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CounterpartyService.name);
  private client!: CounterpartyGrpcClient;

  constructor(
    private configService: ConfigService,
    @Inject('COUNTERPARTY_PACKAGE') private grpcClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.client = this.grpcClient.getService<CounterpartyGrpcClient>('CounterpartyService');
    this.logger.log('CounterpartyService initialized');
  }

  onModuleDestroy() {
    this.logger.log('CounterpartyService destroyed');
  }

  async getCounterparty(id: string): Promise<CounterpartyResponse | null> {
    try {
      return await this.client.getCounterparty({ id });
    } catch (e) {
      this.logger.error(`Failed to get counterparty ${id}: ${String(e)}`);
      return null;
    }
  }

  async getContractTariffs(contractId: string, zone?: string): Promise<ContractTariffResponse[]> {
    try {
      const response = await this.client.getContractTariffs({ contractId, zone });
      return response.items;
    } catch (e) {
      this.logger.error(`Failed to get tariffs for contract ${contractId}: ${String(e)}`);
      return [];
    }
  }

  async validateContract(contractId: string): Promise<ValidateContractResponse> {
    try {
      const contract = await this.client.getContract({ id: contractId });
      const now = Date.now();
      const validTo = contract.validTo;

      if (now > validTo) {
        return { valid: false, contract, error: 'Contract expired' };
      }

      if (contract.status !== 'active') {
        return { valid: false, contract, error: `Contract status is ${contract.status}` };
      }

      return { valid: true, contract };
    } catch (e) {
      this.logger.error(`Failed to validate contract ${contractId}: ${String(e)}`);
      return { valid: false, error: String(e) };
    }
  }

  async calculateEstimatedPrice(
    contractId: string,
    distanceKm: number,
    weightKg: number,
  ): Promise<{ estimatedPrice: number; currency: string }> {
    const tariffs = await this.getContractTariffs(contractId);

    if (tariffs.length === 0) {
      return { estimatedPrice: 0, currency: 'RUB' };
    }

    const tariff = tariffs[0];
    let price = distanceKm * tariff.pricePerKm + weightKg * tariff.pricePerKg;

    if (tariff.minPrice && price < Number(tariff.minPrice)) {
      price = Number(tariff.minPrice);
    }

    return { estimatedPrice: price, currency: 'RUB' };
  }
}