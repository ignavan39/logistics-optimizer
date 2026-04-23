import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvoicesService, InvoiceResponse } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard, RbacGuard)
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

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
  @ApiOperation({ summary: 'Download invoice as PDF' })
  async getInvoicePdf(
    @Param('id') id: string,
    @Res() res: any,
  ) {
    const pdf = await this.service.generateInvoicePdf(id);
    
    if (!pdf) {
      return res.status(404).json({ message: 'Invoice not found or PDF not available' });
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${id}.pdf"`,
    });
    res.send(pdf);
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