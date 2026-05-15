import { Injectable, type OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { loadPackageDefinition, credentials } from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

export interface CounterpartyResponse {
  id: string;
  name: string;
  inn: string;
  kpp?: string;
  type: string;
  address?: string;
  phone?: string;
  email?: string;
  status: string;
  createdAt?: string;
  version?: number;
}

export interface ContractResponse {
  id: string;
  counterpartyId: string;
  number: string;
  type: string;
  status: string;
  validFrom?: string;
  validTo?: string;
}

export interface ContractTariffResponse {
  id: string;
  contractId: string;
  zoneFrom: string;
  zoneTo: string;
  pricePerKg: number;
  pricePerKm: number;
  minPrice: number;
}

export interface ListQuery {
  type?: string;
  inn?: string;
  nameLike?: string;
  limit?: number;
  offset?: number;
  status?: string;
}

const PROTO_PATH = '/app/libs/proto/src/counterparty.proto';

@Injectable()
export class CounterpartyService implements OnModuleInit {
  private readonly logger = new Logger(CounterpartyService.name);
  private client: any;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    try {
      const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      });
      const proto = loadPackageDefinition(packageDefinition) as any;
      
      const CounterpartyServiceProto = proto.counterparty?.CounterpartyService;
      if (!CounterpartyServiceProto) {
        this.logger.error('CounterpartyService not found in proto');
        return;
      }
      
      const url = this.configService.get('GRPC_COUNTERPARTY_HOST', 'counterparty-service:50057');
      this.logger.log(`Connecting to ${url}`);
      
      this.client = new CounterpartyServiceProto(url, credentials.createInsecure());
      this.client.waitForReady(Date.now() + 5000, (err: any) => {
        if (err) this.logger.error(`gRPC connection error: ${err}`);
        else this.logger.log('gRPC client ready');
      });
    } catch (e) {
      this.logger.error(`Failed to init gRPC client: ${e}`);
    }
  }

  async listCounterparties(data: ListQuery = {}): Promise<CounterpartyResponse[]> {
    return new Promise((resolve) => {
      if (!this.client) {
        this.logger.error('gRPC client not initialized');
        resolve([]);
        return;
      }
      
      this.client.listCounterparties({
        type: data.type,
        inn: data.inn,
        nameLike: data.nameLike,
        limit: (data.limit ?? 20) || 20,
        offset: (data.offset ?? 0) || 0,
      }, (err: any, response: any) => {
        if (err) {
          this.logger.error(`listCounterparties error: ${err}`);
          resolve([]);
          return;
        }
        
        const items = (response.items || []).map((item: any) => ({
          id: String(item.id || ''),
          name: String(item.name || ''),
          inn: String(item.inn || ''),
          kpp: item.kpp ? String(item.kpp) : undefined,
          type: String(item.type || ''),
          address: item.address ? String(item.address) : undefined,
          phone: item.phone ? String(item.phone) : undefined,
          email: item.email ? String(item.email) : undefined,
          status: String(item.status || ''),
          createdAt: item.created_at ? String(item.created_at) : undefined,
          version: Number(item.version) || 0,
        }));
        
        resolve(items);
      });
    });
  }

  async getCounterparty(id: string): Promise<CounterpartyResponse | null> {
    return new Promise((resolve) => {
      if (!this.client) {
        this.logger.error('gRPC client not initialized');
        resolve(null);
        return;
      }
      
      this.client.getCounterparty({ id }, (err: any, response: any) => {
        if (err || !response) {
          this.logger.error(`getCounterparty error: ${err}`);
          resolve(null);
          return;
        }
        
        resolve({
          id: String(response.id || ''),
          name: String(response.name || ''),
          inn: String(response.inn || ''),
          kpp: response.kpp ? String(response.kpp) : undefined,
          type: String(response.type || ''),
          address: response.address ? String(response.address) : undefined,
          phone: response.phone ? String(response.phone) : undefined,
          email: response.email ? String(response.email) : undefined,
          status: String(response.status || ''),
          createdAt: response.created_at ? String(response.created_at) : undefined,
          version: Number(response.version) || 0,
        });
      });
    });
  }

  async createCounterparty(data: any): Promise<CounterpartyResponse> {
    return new Promise((resolve) => {
      this.client.createCounterparty(data, (err: any, response: any) => {
        if (err) {
          this.logger.error(`createCounterparty error: ${err}`);
          resolve(null as any);
          return;
        }
        resolve(response);
      });
    });
  }

  async updateCounterparty(data: any): Promise<CounterpartyResponse> {
    return new Promise((resolve) => {
      this.client.updateCounterparty(data, (err: any, response: any) => {
        if (err) {
          this.logger.error(`updateCounterparty error: ${err}`);
          resolve(null as any);
          return;
        }
        resolve(response);
      });
    });
  }

  async listContracts(data: ListQuery & { counterpartyId?: string; status?: string } = {}): Promise<ContractResponse[]> {
    return new Promise((resolve) => {
      if (!this.client) { resolve([]); return; }
      this.client.listContracts({
        counterpartyId: data.counterpartyId,
        status: data.status,
        limit: (data.limit ?? 20) || 20,
        offset: (data.offset ?? 0) || 0,
      }, (err: any, response: any) => {
        if (err) { this.logger.error(err); resolve([]); return; }
        resolve((response.items || []).map((c: any) => ({
          id: String(c.id || ''),
          counterpartyId: String(c.counterparty_id || ''),
          number: String(c.number || ''),
          type: String(c.type || ''),
          status: String(c.status || ''),
          validFrom: c.valid_from ? String(c.valid_from) : undefined,
          validTo: c.valid_to ? String(c.valid_to) : undefined,
        })));
      });
    });
  }

  async getContract(id: string): Promise<ContractResponse | null> {
    return new Promise((resolve) => {
      if (!this.client) { resolve(null); return; }
      this.client.getContract({ id }, (err: any, response: any) => {
        if (err || !response) { resolve(null); return; }
        resolve({
          id: String(response.id || ''),
          counterpartyId: String(response.counterparty_id || ''),
          number: String(response.number || ''),
          type: String(response.type || ''),
          status: String(response.status || ''),
          validFrom: response.valid_from ? String(response.valid_from) : undefined,
          validTo: response.valid_to ? String(response.valid_to) : undefined,
        });
      });
    });
  }

  async createContract(data: any): Promise<ContractResponse> {
    return new Promise((resolve) => {
      if (!this.client) { resolve(null as any); return; }
      this.client.createContract(data, (err: any, response: any) => {
        if (err) { resolve(null as any); return; }
        resolve(response);
      });
    });
  }

  async updateContract(data: any): Promise<ContractResponse> {
    return new Promise((resolve) => {
      if (!this.client) { resolve(null as any); return; }
      this.client.updateContract(data, (err: any, response: any) => {
        if (err) { resolve(null as any); return; }
        resolve(response);
      });
    });
  }

  async getContractTariffs(contractId: string, zone?: string): Promise<ContractTariffResponse[]> {
    return new Promise((resolve) => {
      if (!this.client) { resolve([]); return; }
      this.client.getContractTariffs({ contractId, zone }, (err: any, response: any) => {
        if (err) { resolve([]); return; }
        resolve((response.items || []).map((t: any) => ({
          id: String(t.id || ''),
          contractId: String(t.contract_id || ''),
          zoneFrom: String(t.zone_from || ''),
          zoneTo: String(t.zone_to || ''),
          pricePerKg: Number(t.price_per_kg) || 0,
          pricePerKm: Number(t.price_per_km) || 0,
          minPrice: Number(t.min_price) || 0,
        })));
      });
    });
  }

  async createContractTariff(data: any): Promise<ContractTariffResponse> {
    return new Promise((resolve) => {
      if (!this.client) { resolve(null as any); return; }
      this.client.createContractTariff(data, (err: any, response: any) => {
        if (err) { resolve(null as any); return; }
        resolve(response);
      });
    });
  }
}