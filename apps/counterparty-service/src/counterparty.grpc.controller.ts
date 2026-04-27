import { Controller, Logger, Inject } from '@nestjs/common'
import { GrpcMethod, RpcException } from '@nestjs/microservices'
import { status as GrpcStatus } from '@grpc/grpc-js'
import { CounterpartyService } from './counterparty/counterparty.service'
import { ContractService } from './contract/contract.service'

@Controller()
export class CounterpartyGrpcController {
  private readonly logger = new Logger(CounterpartyGrpcController.name)

  constructor(
    @Inject(CounterpartyService) private readonly counterpartyService: CounterpartyService,
    @Inject(ContractService) private readonly contractService: ContractService,
  ) {}

  @GrpcMethod('CounterpartyService', 'CreateCounterparty')
  async createCounterparty(data: {
    name: string
    type: string
    inn: string
    kpp?: string
    ogrn?: string
    address?: { full: string; lat?: number; lng?: number; city?: string; region?: string }
    contacts?: Array<{ name: string; phone: string; email?: string; position?: string }>
    phone?: string
    email?: string
  }) {
    this.logger.log(`CreateCounterparty: ${data.name} (${data.inn})`)
    try {
      const entity = await this.counterpartyService.create(data)
      return this.toResponse(entity)
    } catch (e) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: String(e),
      })
    }
  }

  @GrpcMethod('CounterpartyService', 'GetCounterparty')
  async getCounterparty(data: { id: string }) {
    const entity = await this.counterpartyService.findById(data.id)
    if (!entity) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Counterparty not found',
      })
    }
    return this.toResponse(entity)
  }

  @GrpcMethod('CounterpartyService', 'UpdateCounterparty')
  async updateCounterparty(data: {
    id: string
    name: string
    type: string
    inn: string
    kpp?: string
    ogrn?: string
    address?: { full: string; lat?: number; lng?: number; city?: string; region?: string }
    contacts?: Array<{ name: string; phone: string; email?: string; position?: string }>
    phone?: string
    email?: string
    expectedVersion?: number
  }) {
    try {
      const entity = await this.counterpartyService.update(data)
      return this.toResponse(entity)
    } catch (e) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: String(e),
      })
    }
  }

  @GrpcMethod('CounterpartyService', 'ListCounterparties')
  async listCounterparties(data: { type?: string; inn?: string; nameLike?: string; limit?: number; offset?: number }) {
    const entities = await this.counterpartyService.findAll(data)
    return {
      items: entities.map(e => this.toResponse(e)),
    }
  }

  @GrpcMethod('CounterpartyService', 'CreateContract')
  async createContract(data: {
    counterpartyId: string
    number: string
    validFrom?: number
    validTo?: number
    totalLimitRub?: number
    paymentTermsDays?: number
    description?: string
  }) {
    try {
      const entity = await this.contractService.create(data)
      return this.toContractResponse(entity)
    } catch (e) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: String(e),
      })
    }
  }

  @GrpcMethod('CounterpartyService', 'GetContract')
  async getContract(data: { id: string }) {
    const entity = await this.contractService.findById(data.id)
    if (!entity) {
      throw new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message: 'Contract not found',
      })
    }
    return this.toContractResponse(entity)
  }

  @GrpcMethod('CounterpartyService', 'UpdateContract')
  async updateContract(data: {
    id: string
    number?: string
    validFrom?: number
    validTo?: number
    status?: string
    totalLimitRub?: number
    paymentTermsDays?: number
    description?: string
    expectedVersion?: number
  }) {
    try {
      const entity = await this.contractService.update(data)
      return this.toContractResponse(entity)
    } catch (e) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: String(e),
      })
    }
  }

  @GrpcMethod('CounterpartyService', 'ListContracts')
  async listContracts(data: { counterpartyId?: string; status?: string; limit?: number; offset?: number }) {
    const entities = await this.contractService.findAll(data)
    return {
      items: entities.map(e => this.toContractResponse(e)),
    }
  }

  @GrpcMethod('CounterpartyService', 'GetContractTariffs')
  async getContractTariffs(data: { contractId: string; zone?: string }) {
    const entities = await this.contractService.findTariffs(data)
    return {
      items: entities.map(e => this.toTariffResponse(e)),
    }
  }

  @GrpcMethod('CounterpartyService', 'CreateContractTariff')
  async createContractTariff(data: {
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
  }) {
    try {
      const entity = await this.contractService.createTariff(data)
      return this.toTariffResponse(entity)
    } catch (e) {
      throw new RpcException({
        code: GrpcStatus.INTERNAL,
        message: String(e),
      })
    }
  }

  private toResponse(entity: any) {
    return {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      inn: entity.inn,
      kpp: entity.kpp,
      ogrn: entity.ogrn,
      address: entity.address,
      contacts: entity.contacts,
      phone: entity.phone,
      email: entity.email,
      createdAt: entity.createdAt?.getTime() ?? 0,
      updatedAt: entity.updatedAt?.getTime() ?? 0,
      version: entity.version,
    }
  }

  private toContractResponse(entity: any) {
    return {
      id: entity.id,
      counterpartyId: entity.counterpartyId,
      number: entity.number,
      validFrom: entity.validFrom?.getTime() ?? 0,
      validTo: entity.validTo?.getTime() ?? 0,
      status: entity.status,
      totalLimitRub: entity.totalLimitRub,
      paymentTermsDays: entity.paymentTermsDays,
      description: entity.description,
      createdAt: entity.createdAt?.getTime() ?? 0,
      updatedAt: entity.updatedAt?.getTime() ?? 0,
      version: entity.version,
    }
  }

  private toTariffResponse(entity: any) {
    return {
      id: entity.id,
      contractId: entity.contractId,
      zone: entity.zone,
      pricePerKm: Number(entity.pricePerKm),
      pricePerKg: Number(entity.pricePerKg),
      minPrice: entity.minPrice ? Number(entity.minPrice) : undefined,
      minWeightKg: entity.minWeightKg ? Number(entity.minWeightKg) : undefined,
      loadingRate: entity.loadingRate ? Number(entity.loadingRate) : undefined,
      unloadingRate: entity.unloadingRate ? Number(entity.unloadingRate) : undefined,
      waitingRate: entity.waitingRate ? Number(entity.waitingRate) : undefined,
      additionalInsurance: entity.additionalInsurance ? Number(entity.additionalInsurance) : undefined,
      vatRate: entity.vatRate ? Number(entity.vatRate) : 20,
      createdAt: entity.createdAt?.getTime() ?? 0,
      updatedAt: entity.updatedAt?.getTime() ?? 0,
      version: entity.version,
    }
  }
}