import { Controller, Get, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CounterpartyService } from '../counterparty/counterparty.service';

@ApiTags('contracts')
@Controller('contracts')
@ApiBearerAuth()
export class ContractsController {
  private readonly logger = new Logger(ContractsController.name);

  constructor(private counterpartyService: CounterpartyService) {}

  @Get()
  @ApiOperation({ summary: 'List contracts' })
  async list(@Query('counterpartyId') counterpartyId?: string) {
    try {
      return await this.counterpartyService.listContracts({ 
        counterpartyId: counterpartyId || undefined 
      });
    } catch (e) {
      this.logger.error(`Failed to list contracts: ${e}`);
      return [];
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contract by ID' })
  async get(@Param('id') id: string) {
    try {
      return await this.counterpartyService.getContract(id);
    } catch (e) {
      return null;
    }
  }
}