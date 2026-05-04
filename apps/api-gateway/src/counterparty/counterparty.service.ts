import { Injectable, type OnModuleInit, type OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import {
  type CounterpartyResponse,
  type ContractResponse,
  type ContractTariffResponse,
  type CreateCounterpartyDto,
  type CreateContractDto,
  type CreateContractTariffDto,
  type UpdateCounterpartyDto,
  type UpdateContractDto,
  type ListQuery,
} from './dto/counterparty.dto';

interface CounterpartyGrpcClient {
  createCounterparty(data: CreateCounterpartyDto, metadata?: Metadata): Promise<CounterpartyResponse>;
  getCounterparty(data: { id: string }, metadata?: Metadata): Promise<CounterpartyResponse>;
  updateCounterparty(data: UpdateCounterpartyDto, metadata?: Metadata): Promise<CounterpartyResponse>;
  listCounterparties(data: ListQuery, metadata?: Metadata): Promise<{ items: CounterpartyResponse[] }>;
  createContract(data: CreateContractDto, metadata?: Metadata): Promise<ContractResponse>;
  getContract(data: { id: string }, metadata?: Metadata): Promise<ContractResponse>;
  updateContract(data: UpdateContractDto, metadata?: Metadata): Promise<ContractResponse>;
  listContracts(data: ListQuery & { counterpartyId?: string; status?: string }, metadata?: Metadata): Promise<{ items: ContractResponse[] }>;
  getContractTariffs(data: { contractId: string; zone?: string }, metadata?: Metadata): Promise<{ items: ContractTariffResponse[] }>;
  createContractTariff(data: CreateContractTariffDto, metadata?: Metadata): Promise<ContractTariffResponse>;
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
    @Inject('COUNTERPARTY_PACKAGE') private grpcClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.client = this.grpcClient.getService<CounterpartyGrpcClient>('CounterpartyService');
    this.logger.log('CounterpartyService initialized');
  }

  onModuleDestroy() {
    this.logger.log('CounterpartyService destroyed');
  }

  async createCounterparty(data: CreateCounterpartyDto): Promise<CounterpartyResponse> {
    const typeValue = data.type ? (this.typeMap[data.type] || data.type) : undefined;
    const transformed = typeValue ? { ...data, type: typeValue } : data;
    return this.client.createCounterparty(transformed as unknown as CreateCounterpartyDto);
  }

  async getCounterparty(id: string): Promise<CounterpartyResponse | null> {
    try {
      return await this.client.getCounterparty({ id });
    } catch (e) {
      this.logger.error(`Failed to get counterparty ${id}: ${e}`);
      return null;
    }
  }

  async updateCounterparty(data: UpdateCounterpartyDto): Promise<CounterpartyResponse> {
    return this.client.updateCounterparty(data);
  }

  async listCounterparties(data: ListQuery = {}): Promise<CounterpartyResponse[]> {
    const response = await this.client.listCounterparties(data);
    return response.items || [];
  }

  async createContract(data: CreateContractDto): Promise<ContractResponse> {
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

  async updateContract(data: UpdateContractDto): Promise<ContractResponse> {
    return this.client.updateContract(data);
  }

  async listContracts(data: ListQuery & { counterpartyId?: string; status?: string } = {}): Promise<ContractResponse[]> {
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

  async createContractTariff(data: CreateContractTariffDto): Promise<ContractTariffResponse> {
    return this.client.createContractTariff(data);
  }
}