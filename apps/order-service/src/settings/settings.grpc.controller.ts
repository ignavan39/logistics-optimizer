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

export interface UpdateCompanySettingsRequest {
  company_name: string;
  company_inn: string;
  company_kpp: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  default_payment_terms_days: number;
  default_vat_rate: number;
}

interface GetCompanySettingsResponse {
  company_name: string;
  company_inn: string;
  company_kpp: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  default_payment_terms_days: number;
  default_vat_rate: number;
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
    return {
      company_name: settings.companyName,
      company_inn: settings.companyInn,
      company_kpp: settings.companyKpp,
      company_address: settings.companyAddress,
      company_phone: settings.companyPhone,
      company_email: settings.companyEmail,
      default_payment_terms_days: settings.defaultPaymentTermsDays,
      default_vat_rate: settings.defaultVatRate,
    };
  }

  @GrpcMethod('OrderService', 'SetSetting')
  async setSetting(data: SetSettingRequest) {
    const setting = await this.settingsService.set(data.key, data.value);
    return { key: setting.key, value: setting.value };
  }

  @GrpcMethod('OrderService', 'UpdateCompanySettings')
  async updateCompanySettings(data: UpdateCompanySettingsRequest): Promise<GetCompanySettingsResponse> {
    const settings = await this.settingsService.updateCompanySettings({
      companyName: data.company_name,
      companyInn: data.company_inn,
      companyKpp: data.company_kpp,
      companyAddress: data.company_address,
      companyPhone: data.company_phone,
      companyEmail: data.company_email,
      defaultPaymentTermsDays: data.default_payment_terms_days,
      defaultVatRate: data.default_vat_rate,
    });
    return {
      company_name: settings.companyName,
      company_inn: settings.companyInn,
      company_kpp: settings.companyKpp,
      company_address: settings.companyAddress,
      company_phone: settings.companyPhone,
      company_email: settings.companyEmail,
      default_payment_terms_days: settings.defaultPaymentTermsDays,
      default_vat_rate: settings.defaultVatRate,
    };
  }
}