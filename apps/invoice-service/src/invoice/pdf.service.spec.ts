import { Test, type TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { PdfService } from './pdf.service';
import { S3StorageService } from './s3-storage.service';
import { PdfStatus } from './entities/invoice.entity';
import { of } from 'rxjs';

describe('PdfService', () => {
  let service: PdfService;

  const mockInvoiceId = '550e8400-e29b-41d4-a716-446655440000';

  const mockDataSource = {
    query: jest.fn(),
  };

  const mockS3Storage = {
    upload: jest.fn(),
    generateKey: jest.fn(),
    getObject: jest.fn(),
    checkHealth: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockOrderGrpc = {
    getService: jest.fn().mockReturnValue({
      GetOrder: jest.fn().mockReturnValue(of({})),
      GetCompanySettings: jest.fn().mockReturnValue(of({})),
    }),
  };

  const mockCounterpartyGrpc = {
    getService: jest.fn().mockReturnValue({
      GetCounterparty: jest.fn().mockReturnValue(of({})),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PdfService,
          useFactory: () => new PdfService(
            mockDataSource as any,
            mockS3Storage as any,
            mockConfigService as any,
            mockOrderGrpc as any,
            mockCounterpartyGrpc as any,
          ),
        },
        { provide: DataSource, useValue: mockDataSource },
        { provide: S3StorageService, useValue: mockS3Storage },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'ORDER_PACKAGE', useValue: mockOrderGrpc },
        { provide: 'COUNTERPARTY_PACKAGE', useValue: mockCounterpartyGrpc },
      ],
    }).compile();

    service = module.get<PdfService>(PdfService);
  });

  describe('getOrGeneratePdf', () => {
    it('should return existing PDF URL if status is ready', async () => {
      const existingUrl = 'http://minio:9000/invoices/2026/04/invoice-id.pdf';
      mockDataSource.query.mockResolvedValueOnce([
        { id: mockInvoiceId, pdf_url: existingUrl, pdf_status: PdfStatus.READY },
      ]);

      const result = await service.getOrGeneratePdf(mockInvoiceId);

      expect(result).toBe(existingUrl);
      expect(mockDataSource.query).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if invoice does not exist', async () => {
      mockDataSource.query.mockResolvedValueOnce([]);

      await expect(service.getOrGeneratePdf('non-existent-id')).rejects.toThrow();
    });

    it('should poll while status is generating until ready', async () => {
      const finalUrl = 'http://minio:9000/invoices/2026/04/ready.pdf';

      mockDataSource.query
        .mockResolvedValueOnce([{ id: mockInvoiceId, pdf_url: null, pdf_status: PdfStatus.GENERATING }])
        .mockResolvedValueOnce([{ id: mockInvoiceId, pdf_url: null, pdf_status: PdfStatus.GENERATING }])
        .mockResolvedValueOnce([{ id: mockInvoiceId, pdf_url: finalUrl, pdf_status: PdfStatus.READY }]);

      const result = await service.getOrGeneratePdf(mockInvoiceId);

      expect(result).toBe(finalUrl);
      expect(mockDataSource.query).toHaveBeenCalledTimes(3);
    });
  });
});

describe('PdfStatus enum', () => {
  it('should have correct values', () => {
    expect(PdfStatus.GENERATING).toBe('generating');
    expect(PdfStatus.READY).toBe('ready');
    expect(PdfStatus.FAILED).toBe('failed');
  });
});

describe('S3StorageService', () => {
  let s3Storage: S3StorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: S3StorageService,
          useFactory: () => new S3StorageService({
            get: (key: string, defaultVal?: string) => {
              const config: Record<string, string> = {
                INVOICE_S3_ENDPOINT: 'http://localhost:9000',
                INVOICE_S3_ACCESS_KEY: 'minio',
                INVOICE_S3_SECRET_KEY: 'minio123',
                INVOICE_PDF_BUCKET: 'invoices',
              };
              return config[key] ?? defaultVal;
            },
          } as any),
        },
      ],
    }).compile();

    s3Storage = module.get<S3StorageService>(S3StorageService);
  });

  it('should include current year and month in key', () => {
    const invoiceId = 'test-id';
    const key = s3Storage.generateKey(invoiceId);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    expect(key).toContain(`${year}/${month}`);
  });
});