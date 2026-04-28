import { Controller, Get, Param, Res } from '@nestjs/common';
import { type Response } from 'express';
import { PdfService } from './pdf.service';
import { S3StorageService } from './s3-storage.service';

@Controller()
export class PdfController {
  constructor(
    private readonly pdfService: PdfService,
    private readonly s3Storage: S3StorageService,
  ) {}

  @Get('invoices/:id/pdf')
  async getInvoicePdf(
    @Param('id') invoiceId: string,
    @Res() res: Response,
  ) {
    const url = await this.pdfService.getOrGeneratePdf(invoiceId);
    const isMinio = url.includes('minio') || url.includes('localhost:9000');

    if (isMinio) {
      res.redirect(302, url);
      return;
    }

    const key = this.extractKeyFromUrl(url);
    if (key) {
      const pdfBuffer = await this.s3Storage.getObject(key);
      if (pdfBuffer) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="invoice-${invoiceId}.pdf"`);
        res.send(pdfBuffer);
        return;
      }
    }

    res.redirect(302, url);
  }

  @Get('health/pdf-storage')
  async checkStorageHealth() {
    const healthy = await this.s3Storage.checkHealth();
    return { status: healthy ? 'ok' : 'unhealthy' };
  }

  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length >= 2) {
        return parts.slice(1).join('/');
      }
      return null;
    } catch {
      return null;
    }
  }
}