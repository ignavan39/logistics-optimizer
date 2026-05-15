export interface CompanySettings {
  companyName?: string
  companyInn?: string
  companyKpp?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  defaultPaymentTermsDays?: number
  defaultVatRate?: number
}

export type UpdateCompanySettingsDto = CompanySettings