export interface Address {
  full: string;
  lat?: number;
  lng?: number;
  city?: string;
  region?: string;
}

export interface Contact {
  name: string;
  phone: string;
  email?: string;
  position?: string;
}

export interface CounterpartyResponse {
  id: string;
  name: string;
  type: string;
  inn: string;
  kpp?: string;
  ogrn?: string;
  address?: Address;
  contacts?: Contact[];
  phone?: string;
  email?: string;
  createdAt?: number;
  updatedAt?: number;
  version?: number;
}

export interface ContractResponse {
  id: string;
  counterpartyId: string;
  number: string;
  validFrom: number;
  validTo: number;
  status: string;
  totalLimitRub?: number;
  paymentTermsDays: number;
  description?: string;
  version?: number;
}

export interface ContractTariffResponse {
  id: string;
  contractId: string;
  zone: string;
  pricePerKm: number;
  pricePerKg: number;
  minPrice?: number;
  minWeightKg?: number;
  loadingRate?: number;
  unloadingRate?: number;
  waitingRate?: number;
  additionalInsurance?: number;
  version?: number;
}

export interface CreateCounterpartyDto {
  name: string;
  type?: 'carrier' | 'warehouse' | 'individual';
  inn?: string;
  kpp?: string;
  ogrn?: string;
  address?: Address;
  contacts?: Contact[];
  phone?: string;
  email?: string;
}

export interface CreateContractDto {
  counterpartyId: string;
  number: string;
  validFrom?: number;
  validTo?: number;
  totalLimitRub?: number;
  paymentTermsDays?: number;
  description?: string;
}

export interface CreateContractTariffDto {
  contractId: string;
  zone: string;
  pricePerKm: number;
  pricePerKg: number;
  minPrice?: number;
  minWeightKg?: number;
  loadingRate?: number;
  unloadingRate?: number;
  waitingRate?: number;
  additionalInsurance?: number;
}

export type UpdateCounterpartyDto = Partial<CreateCounterpartyDto> & { id: string; expectedVersion?: number };

export type UpdateContractDto = Partial<CreateContractDto> & { id: string; status?: string; expectedVersion?: number };

export type ListQuery = {
  type?: string;
  inn?: string;
  nameLike?: string;
  limit?: number;
  offset?: number;
};