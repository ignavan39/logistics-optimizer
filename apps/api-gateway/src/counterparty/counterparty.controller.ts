import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { CounterpartyService } from './counterparty.service';
import {
  type CreateCounterpartyDto,
  type CreateContractDto,
  type CreateContractTariffDto,
} from './dto/counterparty.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('counterparties')
@UseGuards(JwtAuthGuard)
export class CounterpartyController {
  constructor(private readonly service: CounterpartyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCounterpartyDto) {
    return this.service.createCounterparty(dto);
  }

  @Get()
  async list() {
    return this.service.listCounterparties();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.service.getCounterparty(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateCounterpartyDto>) {
    return this.service.updateCounterparty({ id, ...dto });
  }
}

@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractController {
  constructor(private readonly service: CounterpartyService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateContractDto) {
    const data = {
      ...dto,
      validFrom: dto.validFrom ? new Date(dto.validFrom).getTime() : undefined,
      validTo: dto.validTo ? new Date(dto.validTo).getTime() : undefined,
    };
    return this.service.createContract(data);
  }

  @Get()
  async list() {
    return this.service.listContracts();
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.service.getContract(id);
  }

  @Get(':id/tariffs')
  async getTariffs(@Param('id') id: string) {
    return this.service.getContractTariffs(id);
  }

  @Post(':id/tariffs')
  @HttpCode(HttpStatus.CREATED)
  async createTariff(
    @Param('id') contractId: string,
    @Body() dto: Omit<CreateContractTariffDto, 'contractId'>,
  ) {
    return this.service.createContractTariff({ contractId, ...dto });
  }
}