import { Injectable, Logger } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { SettingEntity, SettingKey } from './entities/setting.entity';

export interface CompanySettings {
  companyName: string;
  companyInn: string;
  companyKpp: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  defaultPaymentTermsDays: number;
  defaultVatRate: number;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly dataSource: DataSource,
  ) {}

  private get repo() {
    return this.dataSource.getRepository(SettingEntity);
  }

  async get(key: string): Promise<string | null> {
    const setting = await this.repo.findOne({ where: { key } });
    return setting?.value ?? null;
  }

  async set(key: string, value: string): Promise<SettingEntity> {
    let setting = await this.repo.findOne({ where: { key } });
    if (setting) {
      setting.value = value;
    } else {
      setting = this.repo.create({ key, value });
    }
    return this.repo.save(setting);
  }

  async getAll(keys: string[]): Promise<Record<string, string>> {
    const settings = await this.repo.find({ where: { key: In(keys) } });
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }

  async getCompanySettings(): Promise<CompanySettings> {
    const keys = [
      SettingKey.COMPANY_NAME,
      SettingKey.COMPANY_INN,
      SettingKey.COMPANY_KPP,
      SettingKey.COMPANY_ADDRESS,
      SettingKey.COMPANY_PHONE,
      SettingKey.COMPANY_EMAIL,
      SettingKey.DEFAULT_PAYMENT_TERMS_DAYS,
      SettingKey.DEFAULT_VAT_RATE,
    ];

    const settings = await this.getAll(keys);

    return {
      companyName: settings[SettingKey.COMPANY_NAME] || 'Company',
      companyInn: settings[SettingKey.COMPANY_INN] || '',
      companyKpp: settings[SettingKey.COMPANY_KPP] || '',
      companyAddress: settings[SettingKey.COMPANY_ADDRESS] || '',
      companyPhone: settings[SettingKey.COMPANY_PHONE] || '',
      companyEmail: settings[SettingKey.COMPANY_EMAIL] || '',
      defaultPaymentTermsDays: parseInt(settings[SettingKey.DEFAULT_PAYMENT_TERMS_DAYS] || '30', 10),
      defaultVatRate: parseInt(settings[SettingKey.DEFAULT_VAT_RATE] || '20', 10),
    };
  }

  async updateCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings> {
    if (settings.companyName !== undefined) {
      await this.set(SettingKey.COMPANY_NAME, settings.companyName);
    }
    if (settings.companyInn !== undefined) {
      await this.set(SettingKey.COMPANY_INN, settings.companyInn);
    }
    if (settings.companyKpp !== undefined) {
      await this.set(SettingKey.COMPANY_KPP, settings.companyKpp);
    }
    if (settings.companyAddress !== undefined) {
      await this.set(SettingKey.COMPANY_ADDRESS, settings.companyAddress);
    }
    if (settings.companyPhone !== undefined) {
      await this.set(SettingKey.COMPANY_PHONE, settings.companyPhone);
    }
    if (settings.companyEmail !== undefined) {
      await this.set(SettingKey.COMPANY_EMAIL, settings.companyEmail);
    }
    if (settings.defaultPaymentTermsDays !== undefined) {
      await this.set(SettingKey.DEFAULT_PAYMENT_TERMS_DAYS, settings.defaultPaymentTermsDays.toString());
    }
    if (settings.defaultVatRate !== undefined) {
      await this.set(SettingKey.DEFAULT_VAT_RATE, settings.defaultVatRate.toString());
    }
    return this.getCompanySettings();
  }

  async seedDefaults(): Promise<void> {
    const defaults = [
      { key: SettingKey.COMPANY_NAME, value: 'ООО "Логистическая Компания"' },
      { key: SettingKey.COMPANY_INN, value: '7712345678' },
      { key: SettingKey.COMPANY_KPP, value: '771201001' },
      { key: SettingKey.COMPANY_ADDRESS, value: 'г. Москва, ул. Примерная, д. 1' },
      { key: SettingKey.COMPANY_PHONE, value: '+7 (495) 123-45-67' },
      { key: SettingKey.COMPANY_EMAIL, value: 'info@example.ru' },
      { key: SettingKey.DEFAULT_PAYMENT_TERMS_DAYS, value: '30' },
      { key: SettingKey.DEFAULT_VAT_RATE, value: '20' },
    ];

    for (const { key, value } of defaults) {
      const existing = await this.repo.findOne({ where: { key } });
      if (!existing) {
        await this.repo.save(this.repo.create({ key, value }));
        this.logger.log(`Seeded setting: ${key}`);
      }
    }
  }
}