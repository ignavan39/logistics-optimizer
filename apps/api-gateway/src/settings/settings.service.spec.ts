import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';
import { SettingsService } from './settings.service';
import { CompanySettings } from './settings.dto';

const mockConfigService = {
  get: jest.fn(),
};

const mockGrpcClient = {
  getService: jest.fn(),
};

describe('SettingsService', () => {
  let service: SettingsService;
  let grpcClient: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockClient = {
      getCompanySettings: jest.fn(),
      setSetting: jest.fn(),
      updateCompanySettings: jest.fn(),
    };

    grpcClient = mockClient;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'ORDER_PACKAGE', useValue: { getService: () => mockClient } },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCompanySettings()', () => {
    it('should return settings from gRPC', async () => {
      const settings: CompanySettings = {
        companyName: 'Test Company',
        companyInn: '1234567890',
        companyKpp: '123456789',
        companyAddress: 'Test Address',
        companyPhone: '+7 123 456-78-90',
        companyEmail: 'test@example.com',
        defaultPaymentTermsDays: 30,
        defaultVatRate: 20,
      };
      grpcClient.getCompanySettings.mockResolvedValue(settings);

      const result = await service.getCompanySettings();

      expect(result).toEqual(settings);
    });

    it('should return null on error', async () => {
      grpcClient.getCompanySettings.mockRejectedValue(new Error('Connection failed'));

      const result = await service.getCompanySettings();

      expect(result).toBeNull();
    });
  });

  describe('setSetting()', () => {
    it('should call gRPC setSetting()', async () => {
      const response = { key: 'company_name', value: 'New Name' };
      grpcClient.setSetting.mockResolvedValue(response);

      const result = await service.setSetting('company_name', 'New Name');

      expect(grpcClient.setSetting).toHaveBeenCalledWith({ key: 'company_name', value: 'New Name' });
      expect(result).toEqual(response);
    });

    it('should return null on error', async () => {
      grpcClient.setSetting.mockRejectedValue(new Error('Connection failed'));

      const result = await service.setSetting('company_name', 'New Name');

      expect(result).toBeNull();
    });
  });

  describe('updateCompanySettings()', () => {
    it('should call gRPC updateCompanySettings()', async () => {
      const input = {
        companyName: 'New Company',
        companyInn: '9999999999',
        companyKpp: '999999999',
        companyAddress: 'New Address',
        companyPhone: '+7 999 999-99-99',
        companyEmail: 'new@example.com',
        defaultPaymentTermsDays: 45,
        defaultVatRate: 18,
      };
      grpcClient.updateCompanySettings.mockResolvedValue(input);

      const result = await service.updateCompanySettings(input);

      expect(grpcClient.updateCompanySettings).toHaveBeenCalledWith(input);
      expect(result).toEqual(input);
    });

    it('should return null on error', async () => {
      grpcClient.updateCompanySettings.mockRejectedValue(new Error('Connection failed'));

      const result = await service.updateCompanySettings({ companyName: 'Test' });

      expect(result).toBeNull();
    });

    it('should handle partial updates', async () => {
      const partialInput = { companyName: 'Partial Update' };
      const fullSettings: CompanySettings = {
        companyName: 'Partial Update',
        companyInn: '1234567890',
        companyKpp: '123456789',
        companyAddress: 'Address',
        companyPhone: 'Phone',
        companyEmail: 'email@example.com',
        defaultPaymentTermsDays: 30,
        defaultVatRate: 20,
      };
      grpcClient.updateCompanySettings.mockResolvedValue(fullSettings);

      const result = await service.updateCompanySettings(partialInput);

      expect(result).toEqual(fullSettings);
    });
  });
});