export interface Counterparty {
  id: string
  name: string
  type: 'CLIENT' | 'CARRIER' | 'BOTH'
  status: 'ACTIVE' | 'INACTIVE'
  contactEmail?: string
  contactPhone?: string
  inn?: string
  kpp?: string
}

export interface CreateCounterpartyDto {
  name: string
  type: 'CLIENT' | 'CARRIER' | 'BOTH'
  inn?: string
  kpp?: string
  contactEmail?: string
  contactPhone?: string
}

export interface CreateContractDto {
  counterpartyId: string
  number?: string
  startDate?: string
  endDate?: string
  totalLimitRub?: number
  paymentTermsDays?: number
  validFrom?: number
  validTo?: number
}

export interface CreateContractTariffDto {
  zoneFrom: string
  zoneTo: string
  pricePerKm: number
  minPrice: number
  pricePerKg: number
  minWeight: number
  zone?: string
}

export interface ContractTariff {
  id: string
  contractId: string
  zoneFrom: string
  zoneTo: string
  pricePerKm: number
  minPrice: number
  pricePerKg: number
  minWeight: number
  zone?: string
}