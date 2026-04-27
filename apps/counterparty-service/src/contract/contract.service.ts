import { Injectable, Inject } from '@nestjs/common'
import { DataSource, Repository } from 'typeorm'
import { ContractEntity, ContractStatus } from '../entities/contract.entity'
import { ContractTariffEntity } from '../entities/contract-tariff.entity'
import { v4 as uuidv4 } from 'uuid'

interface CreateContractData {
  counterpartyId: string
  number: string
  validFrom?: number
  validTo?: number
  totalLimitRub?: number
  paymentTermsDays?: number
  description?: string
}

interface UpdateContractData {
  id: string
  counterpartyId?: string
  number?: string
  validFrom?: number
  validTo?: number
  status?: string
  totalLimitRub?: number
  paymentTermsDays?: number
  description?: string
  expectedVersion?: number
}

interface FindAllContractData {
  counterpartyId?: string
  status?: string
  limit?: number
  offset?: number
}

interface CreateTariffData {
  contractId: string
  zone: string
  pricePerKm: number
  pricePerKg: number
  minPrice?: number
  minWeightKg?: number
  loadingRate?: number
  unloadingRate?: number
  waitingRate?: number
  additionalInsurance?: number
  vatRate?: number
}

interface FindTariffsData {
  contractId: string
  zone?: string
}

@Injectable()
export class ContractService {
  private readonly contractRepo: Repository<ContractEntity>
  private readonly tariffRepo: Repository<ContractTariffEntity>

  constructor(@Inject(DataSource) dataSource: DataSource) {
    this.contractRepo = dataSource.getRepository(ContractEntity)
    this.tariffRepo = dataSource.getRepository(ContractTariffEntity)
  }

  async create(data: CreateContractData): Promise<ContractEntity> {
    const now = new Date()
    const entity = this.contractRepo.create({
      id: uuidv4(),
      counterpartyId: data.counterpartyId,
      number: data.number,
      validFrom: data.validFrom ? new Date(data.validFrom) : now,
      validTo: data.validTo ? new Date(data.validTo) : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      status: ContractStatus.DRAFT,
      totalLimitRub: data.totalLimitRub,
      paymentTermsDays: data.paymentTermsDays ?? 30,
      description: data.description,
    })
    return this.contractRepo.save(entity)
  }

  async findById(id: string): Promise<ContractEntity | null> {
    return this.contractRepo.findOne({ where: { id } })
  }

  async findAll(data: FindAllContractData): Promise<ContractEntity[]> {
    const qb = this.contractRepo.createQueryBuilder('c')

    if (data.counterpartyId) {
      qb.andWhere('c.counterparty_id = :counterpartyId', { counterpartyId: data.counterpartyId })
    }
    if (data.status) {
      qb.andWhere('c.status = :status', { status: data.status })
    }

    qb.orderBy('c.created_at', 'DESC')

    if (data.limit) {
      qb.take(data.limit)
    }
    if (data.offset) {
      qb.skip(data.offset)
    }

    return qb.getMany()
  }

  async update(data: UpdateContractData): Promise<ContractEntity> {
    const existing = await this.findById(data.id)
    if (!existing) {
      throw new Error('Contract not found')
    }

    if (data.expectedVersion !== undefined && existing.version !== data.expectedVersion) {
      throw new Error('Version conflict')
    }

    Object.assign(existing, {
      number: data.number,
      validFrom: data.validFrom ? new Date(data.validFrom) : existing.validFrom,
      validTo: data.validTo ? new Date(data.validTo) : existing.validTo,
      status: data.status ? (data.status as ContractStatus) : existing.status,
      totalLimitRub: data.totalLimitRub ?? existing.totalLimitRub,
      paymentTermsDays: data.paymentTermsDays ?? existing.paymentTermsDays,
      description: data.description ?? existing.description,
    })

    return this.contractRepo.save(existing)
  }

  async findTariffs(data: FindTariffsData): Promise<ContractTariffEntity[]> {
    const qb = this.tariffRepo.createQueryBuilder('t')

    if (data.contractId) {
      qb.andWhere('t.contract_id = :contractId', { contractId: data.contractId })
    }
    if (data.zone) {
      qb.andWhere('t.zone = :zone', { zone: data.zone })
    }

    qb.orderBy('t.zone', 'ASC')

    return qb.getMany()
  }

  async createTariff(data: CreateTariffData): Promise<ContractTariffEntity> {
    const entity = this.tariffRepo.create({
      id: uuidv4(),
      contractId: data.contractId,
      zone: data.zone,
      pricePerKm: data.pricePerKm,
      pricePerKg: data.pricePerKg,
      minPrice: data.minPrice,
      minWeightKg: data.minWeightKg,
      loadingRate: data.loadingRate,
      unloadingRate: data.unloadingRate,
      waitingRate: data.waitingRate,
      additionalInsurance: data.additionalInsurance,
      vatRate: data.vatRate ?? 20,
    })
    return this.tariffRepo.save(entity)
  }
}