import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { CompanySettings, SettingResponse, UpdateCompanySettingsDto } from './settings.dto';

interface OrderGrpcClient {
  getCompanySettings(): Promise<CompanySettings>;
  setSetting(data: { key: string; value: string }): Promise<SettingResponse>;
  updateCompanySettings(data: UpdateCompanySettingsDto): Promise<CompanySettings>;
}

@Injectable()
export class SettingsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SettingsService.name);
  private client!: OrderGrpcClient;

  constructor(
    private configService: ConfigService,
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
      return await this.client.getCompanySettings();
    } catch (e) {
      this.logger.error(`Failed to get company settings: ${e}`);
      return null;
    }
  }

  async setSetting(key: string, value: string): Promise<SettingResponse | null> {
    try {
      return await this.client.setSetting({ key, value });
    } catch (e) {
      this.logger.error(`Failed to set setting ${key}: ${e}`);
      return null;
    }
  }

  async updateCompanySettings(settings: UpdateCompanySettingsDto): Promise<CompanySettings | null> {
    try {
      return await this.client.updateCompanySettings(settings);
    } catch (e) {
      this.logger.error(`Failed to update company settings: ${e}`);
      return null;
    }
  }
}