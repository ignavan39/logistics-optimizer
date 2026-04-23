import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import {
  CounterpartyResponse,
  ContractResponse,
  ContractTariffResponse,
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
    return this.client.createCounterparty(data);
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