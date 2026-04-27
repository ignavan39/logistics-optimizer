import { Injectable, type OnModuleInit, type OnModuleDestroy, Logger } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { type ClientGrpc } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { type Metadata } from '@grpc/grpc-js';
import {
  type CounterpartyResponse,
  type ContractResponse,
  type ContractTariffResponse,
} from './dto/counterparty.dto';

interface CounterpartyGrpcClient {
  createCounterparty(data: any, metadata?: Metadata): Promise<CounterpartyResponse>;
  getCounterparty(data: { id: string }, metadata?: Metadata): Promise<CounterpartyResponse>;
  updateCounterparty(data: any, metadata?: Metadata): Promise<CounterpartyResponse>;
  listCounterparties(data: any, metadata?: Metadata): Promise<{ items: CounterpartyResponse[] }>;
  createContract(data: any, metadata?: Metadata): Promise<ContractResponse>;
  getContract(data: { id: string }, metadata?: Metadata): Promise<ContractResponse>;
  updateContract(data: any, metadata?: Metadata): Promise<ContractResponse>;
  listContracts(data: any, metadata?: Metadata): Promise<{ items: ContractResponse[] }>;
  getContractTariffs(data: { contractId: string }, metadata?: Metadata): Promise<{ items: ContractTariffResponse[] }>;
  createContractTariff(data: any, metadata?: Metadata): Promise<ContractTariffResponse>;
}

@Injectable()
export class CounterpartyService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CounterpartyService.name);
  private client!: CounterpartyGrpcClient;

  private readonly typeMap: Record<string, number> = {
    'CARRIER': 1,
    'WAREHOUSE': 2,
    'INDIVIDUAL': 3,
  };

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

  async createCounterparty(data: any): Promise<CounterpartyResponse> {
    const typeValue = this.typeMap[data.type] || data.type;
    const transformed = { ...data, type: typeValue };
    this.logger.debug(`createCounterparty input: ${JSON.stringify(transformed)}`);
    return this.client.createCounterparty(transformed);
  }

  async getCounterparty(id: string): Promise<CounterpartyResponse | null> {
    try {
      return await this.client.getCounterparty({ id });
    } catch (e) {
      this.logger.error(`Failed to get counterparty ${id}: ${e}`);
      return null;
    }
  }

  async updateCounterparty(data: any): Promise<CounterpartyResponse> {
    return this.client.updateCounterparty(data);
  }

  async listCounterparties(data: any = {}): Promise<CounterpartyResponse[]> {
    this.logger.debug(`listCounterparties input: ${JSON.stringify(data)}`);
    const response = await this.client.listCounterparties(data);
    return response.items || [];
  }

  async createContract(data: any): Promise<ContractResponse> {
    return this.client.createContract(data);
  }

  async getContract(id: string): Promise<ContractResponse | null> {
    try {
      return await this.client.getContract({ id });
    } catch (e) {
      this.logger.error(`Failed to get contract ${id}: ${e}`);
      return null;
    }
  }

  async updateContract(data: any): Promise<ContractResponse> {
    return this.client.updateContract(data);
  }

  async listContracts(data: any = {}): Promise<ContractResponse[]> {
    const response = await this.client.listContracts(data);
    return response.items || [];
  }

  async getContractTariffs(contractId: string): Promise<ContractTariffResponse[]> {
    try {
      const response = await this.client.getContractTariffs({ contractId });
      return response.items || [];
    } catch (e) {
      this.logger.error(`Failed to get tariffs for contract ${contractId}: ${e}`);
      return [];
    }
  }

  async createContractTariff(data: any): Promise<ContractTariffResponse> {
    return this.client.createContractTariff(data);
  }
}