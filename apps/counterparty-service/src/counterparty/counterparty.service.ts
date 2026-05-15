import { Injectable, Inject, Logger } from '@nestjs/common'
import { Repository } from 'typeorm'
import { CounterpartyEntity, CounterpartyType } from '../entities/counterparty.entity'
import { v4 as uuidv4 } from 'uuid'

interface CreateCounterpartyData {
  name: string
  type: string
  inn: string
  kpp?: string
  ogrn?: string
  address?: { full: string; lat?: number; lng?: number; city?: string; region?: string }
  contacts?: Array<{ name: string; phone: string; email?: string; position?: string }>
  phone?: string
  email?: string
}

interface UpdateCounterpartyData extends CreateCounterpartyData {
  id: string
  expectedVersion?: number
}

interface FindAllCounterpartyData {
  type?: string
  inn?: string
  nameLike?: string
  limit?: number
  offset?: number
}

@Injectable()
export class CounterpartyService {
  private readonly logger = new Logger(CounterpartyService.name)

  constructor(
    @Inject('COUNTERPARTY_REPOSITORY') private repo: Repository<CounterpartyEntity>,
  ) {}

  async create(data: CreateCounterpartyData): Promise<CounterpartyEntity> {
    const entity = this.repo.create({
      id: uuidv4(),
      name: data.name,
      type: (data.type as CounterpartyType) || CounterpartyType.CARRIER,
      inn: data.inn,
      kpp: data.kpp,
      ogrn: data.ogrn,
      address: data.address,
      contacts: data.contacts,
      phone: data.phone,
      email: data.email,
    })
    return this.repo.save(entity)
  }

  async findById(id: string): Promise<CounterpartyEntity | null> {
    return this.repo.findOne({ where: { id } })
  }

  async findByInn(inn: string): Promise<CounterpartyEntity | null> {
    return this.repo.findOne({ where: { inn } })
  }

  async findAll(data: FindAllCounterpartyData): Promise<CounterpartyEntity[]> {
    const qb = this.repo.createQueryBuilder('c')

    if (data.type) {
      qb.andWhere('c.type = :type', { type: data.type })
    }
    if (data.inn) {
      qb.andWhere('c.inn = :inn', { inn: data.inn })
    }
    if (data.nameLike) {
      qb.andWhere('c.name ILIKE :name', { name: `%${data.nameLike}%` })
    }

    qb.orderBy('c.name', 'ASC')

    if (data.limit) {
      qb.take(data.limit)
    }
    if (data.offset) {
      qb.skip(data.offset)
    }

    const result = await qb.getMany()
    return result
  }

  async update(data: UpdateCounterpartyData): Promise<CounterpartyEntity> {
    const existing = await this.findById(data.id)
    if (!existing) {
      throw new Error('Counterparty not found')
    }

    if (data.expectedVersion !== undefined && existing.version !== data.expectedVersion) {
      throw new Error('Version conflict')
    }

    Object.assign(existing, {
      name: data.name,
      type: (data.type as CounterpartyType) || existing.type,
      inn: data.inn,
      kpp: data.kpp,
      ogrn: data.ogrn,
      address: data.address,
      contacts: data.contacts,
      phone: data.phone,
      email: data.email,
    })

    return this.repo.save(existing)
  }
}