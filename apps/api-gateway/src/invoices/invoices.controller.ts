import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { type InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RbacGuard)
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  @Permissions('invoices.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List invoices with pagination' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'] })
  @ApiQuery({ name: 'counterparty_id', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async list(
    @Query('status') status?: string,
    @Query('counterparty_id') counterpartyId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.listInvoices({
      status,
      counterpartyId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get(':id')
  @Permissions('invoices.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get invoice by ID' })
  async getInvoice(@Param('id') id: string) {
    return this.service.getInvoice(id);
  }

  @Get(':id/pdf')
  @Permissions('invoices.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get invoice PDF URL' })
  async getInvoicePdf(@Param('id') id: string) {
    const result = await this.service.generateInvoicePdfUrl(id);
    
    if (!result) {
      return { statusCode: 404, message: 'Invoice not found or PDF not available' };
    }

    return result;
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @Permissions('invoices.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update invoice status' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'paid' | 'cancelled',
  ) {
    return this.service.updateInvoiceStatus(id, status);
  }
}