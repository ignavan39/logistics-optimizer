import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy, Inject } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { type ClientGrpc } from '@nestjs/microservices';
import { type Observable } from 'rxjs';
import { type CompanySettings, type SettingResponse, type UpdateCompanySettingsDto } from './settings.dto';

interface OrderGrpcClient {
  getCompanySettings(options?: unknown): Observable<unknown>;
  setSetting(data: { key: string; value: string }): Observable<SettingResponse>;
  updateCompanySettings(data: unknown): Observable<unknown>;
}

function mapResponseToCompanySettings(obj: unknown): CompanySettings {
  const o = obj as Record<string, unknown>;
  return {
    companyName: String(o.company_name ?? o.companyName ?? ''),
    companyInn: String(o.company_inn ?? o.companyInn ?? ''),
    companyKpp: String(o.company_kpp ?? o.companyKpp ?? ''),
    companyAddress: String(o.company_address ?? o.companyAddress ?? ''),
    companyPhone: String(o.company_phone ?? o.companyPhone ?? ''),
    companyEmail: String(o.company_email ?? o.companyEmail ?? ''),
    defaultPaymentTermsDays: Number(o.default_payment_terms_days ?? o.defaultPaymentTermsDays ?? 30),
    defaultVatRate: Number(o.default_vat_rate ?? o.defaultVatRate ?? 20),
  };
}

@Injectable()
export class SettingsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SettingsService.name);
  private client!: OrderGrpcClient;

  constructor(
    @Inject('ORDER_PACKAGE') private grpcClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.client = this.grpcClient.getService<OrderGrpcClient>('OrderService');
    this.logger.log('SettingsService initialized');
  }

  onModuleDestroy() {
    this.logger.log('SettingsService destroyed');
  }

  async getCompanySettings(): Promise<CompanySettings | null> {
    try {
      const result = this.client.getCompanySettings({});
      return new Promise<CompanySettings>((resolve, reject) => {
        result.subscribe({
          next: (data) => {
            this.logger.log(`Response: ${JSON.stringify(data)}`);
            resolve(mapResponseToCompanySettings(data));
          },
          error: (err) => {
            this.logger.error(`gRPC error: ${err}`);
            reject(err);
          },
        });
      });
    } catch (e) {
      this.logger.error(`Failed to get company settings: ${e}`);
      return null;
    }
  }

  async setSetting(key: string, value: string): Promise<SettingResponse | null> {
    try {
      return new Promise<SettingResponse>((resolve, reject) => {
        this.client.setSetting({ key, value }).subscribe({
          next: (data) => { resolve(data); },
          error: (err) => {
            this.logger.error(`Failed to set setting ${key}: ${err}`);
            reject(err);
          },
        });
      });
    } catch (e) {
      this.logger.error(`Failed to set setting ${key}: ${e}`);
      return null;
    }
  }

  async updateCompanySettings(settings: UpdateCompanySettingsDto): Promise<CompanySettings | null> {
    try {
      const result = this.client.updateCompanySettings(settings);
      return new Promise<CompanySettings>((resolve, reject) => {
        result.subscribe({
          next: (data) => { resolve(mapResponseToCompanySettings(data)); },
          error: (err) => {
            this.logger.error(`Failed to update company settings: ${err}`);
            reject(err);
          },
        });
      });
    } catch (e) {
      this.logger.error(`Failed to update company settings: ${e}`);
      return null;
    }
  }
}