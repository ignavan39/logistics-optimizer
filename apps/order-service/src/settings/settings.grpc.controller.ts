import { Controller, Logger, Inject } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { SettingsService } from './settings.service';

interface GetSettingRequest {
  key: string;
}

interface SetSettingRequest {
  key: string;
  value: string;
}

interface UpdateCompanySettingsRequest {
  companyName: string;
  companyInn: string;
  companyKpp: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  defaultPaymentTermsDays: number;
  defaultVatRate: number;
}

interface GetCompanySettingsResponse {
  companyName: string;
  companyInn: string;
  companyKpp: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  defaultPaymentTermsDays: number;
  defaultVatRate: number;
}

@Controller()
export class SettingsGrpcController {
  private readonly logger = new Logger(SettingsGrpcController.name);

  constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @GrpcMethod('OrderService', 'GetSetting')
  async getSetting(data: GetSettingRequest) {
    const value = await this.settingsService.get(data.key);
    return { key: data.key, value: value || '' };
  }

  @GrpcMethod('OrderService', 'GetCompanySettings')
  async getCompanySettings(): Promise<GetCompanySettingsResponse> {
    const settings = await this.settingsService.getCompanySettings();
    return settings;
  }

  @GrpcMethod('OrderService', 'SetSetting')
  async setSetting(data: SetSettingRequest) {
    const setting = await this.settingsService.set(data.key, data.value);
    return { key: setting.key, value: setting.value };
  }

  @GrpcMethod('OrderService', 'UpdateCompanySettings')
  async updateCompanySettings(data: UpdateCompanySettingsRequest): Promise<GetCompanySettingsResponse> {
    const settings = await this.settingsService.updateCompanySettings(data);
    return settings;
  }
}