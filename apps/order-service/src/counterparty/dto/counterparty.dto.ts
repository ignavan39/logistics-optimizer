import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

export enum CounterpartyType {
  CARRIER = 'carrier',
  WAREHOUSE = 'warehouse',
  INDIVIDUAL = 'individual',
}

export class GetCounterpartyDto {
  @IsString()
  id!: string;
}

export class CreateCounterpartyDto {
  @IsString()
  name!: string;

  @IsEnum(CounterpartyType)
  @IsOptional()
  type?: CounterpartyType;

  @IsString()
  inn!: string;

  @IsString()
  @IsOptional()
  kpp?: string;

  @IsString()
  @IsOptional()
  ogrn?: string;

  @IsObject()
  @IsOptional()
  address?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  contacts?: Record<string, unknown>[];

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;
}

export class GetContractTariffsDto {
  @IsString()
  contractId!: string;

  @IsString()
  @IsOptional()
  zone?: string;
}

export class ValidateContractDto {
  @IsString()
  contractId!: string;
}

export interface CounterpartyResponse {
  id: string;
  name: string;
  type: string;
  inn: string;
  kpp?: string;
  ogrn?: string;
  address?: Record<string, unknown>;
  contacts?: Record<string, unknown>[];
  phone?: string;
  email?: string;
  createdAt?: number;
  updatedAt?: number;
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

export interface ValidateContractResponse {
  valid: boolean;
  contract?: ContractResponse;
  error?: string;
}