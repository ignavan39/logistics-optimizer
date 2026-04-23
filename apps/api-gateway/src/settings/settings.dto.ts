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

export interface SettingResponse {
  key: string;
  value: string;
}

export interface UpdateCompanySettingsDto {
  companyName?: string;
  companyInn?: string;
  companyKpp?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  defaultPaymentTermsDays?: number;
  defaultVatRate?: number;
}