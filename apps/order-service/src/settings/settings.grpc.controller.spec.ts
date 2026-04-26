import { Test, TestingModule } from '@nestjs/testing';
import { SettingsGrpcController, UpdateCompanySettingsRequest } from './settings.grpc.controller';
import { SettingsService, CompanySettings } from './settings.service';

const mockSettingsService = {
  get: jest.fn(),
  set: jest.fn(),
  getCompanySettings: jest.fn(),
  updateCompanySettings: jest.fn(),
};

describe('SettingsGrpcController', () => {
  let controller: SettingsGrpcController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsGrpcController],
      providers: [
        { provide: SettingsService, useValue: mockSettingsService },
      ],
    }).compile();

    controller = module.get<SettingsGrpcController>(SettingsGrpcController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSetting()', () => {
    it('should return setting from service', async () => {
      mockSettingsService.get.mockResolvedValue('Test Value');

      const result = await controller.getSetting({ key: 'company_name' });

      expect(mockSettingsService.get).toHaveBeenCalledWith('company_name');
      expect(result).toEqual({ key: 'company_name', value: 'Test Value' });
    });

    it('should return empty string for null value', async () => {
      mockSettingsService.get.mockResolvedValue(null);

      const result = await controller.getSetting({ key: 'nonexistent' });

      expect(result).toEqual({ key: 'nonexistent', value: '' });
    });
  });

  describe('getCompanySettings()', () => {
    it('should return company settings with snake_case keys', async () => {
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
      mockSettingsService.getCompanySettings.mockResolvedValue(settings);

      const result = await controller.getCompanySettings();

      expect(mockSettingsService.getCompanySettings).toHaveBeenCalled();
      expect(result.company_name).toBe('Test Company');
      expect(result.company_inn).toBe('1234567890');
    });
  });

  describe('setSetting()', () => {
    it('should call service.set() with correct params', async () => {
      const mockSetting = { key: 'company_name', value: 'New Name' };
      mockSettingsService.set.mockResolvedValue(mockSetting);

      const result = await controller.setSetting({ key: 'company_name', value: 'New Name' });

      expect(mockSettingsService.set).toHaveBeenCalledWith('company_name', 'New Name');
      expect(result).toEqual(mockSetting);
    });

    it('should return setting entity from service', async () => {
      mockSettingsService.set.mockResolvedValue({ key: 'test', value: 'value' });

      const result = await controller.setSetting({ key: 'test', value: 'value' });

      expect(result).toEqual({ key: 'test', value: 'value' });
    });
  });

  describe('updateCompanySettings()', () => {
    it('should call service.updateCompanySettings()', async () => {
      const input = {
        company_name: 'New Company',
        company_inn: '9999999999',
        company_kpp: '999999999',
        company_address: 'New Address',
        company_phone: '+7 999 999-99-99',
        company_email: 'new@example.com',
        default_payment_terms_days: 45,
        default_vat_rate: 18,
      };
      mockSettingsService.updateCompanySettings.mockResolvedValue({
        companyName: 'New Company',
        companyInn: '9999999999',
        companyKpp: '999999999',
        companyAddress: 'New Address',
        companyPhone: '+7 999 999-99-99',
        companyEmail: 'new@example.com',
        defaultPaymentTermsDays: 45,
        defaultVatRate: 18,
      });

      const result = await controller.updateCompanySettings(input);

      expect(mockSettingsService.updateCompanySettings).toHaveBeenCalled();
      expect(result.company_name).toBe('New Company');
    });

    it('should handle partial updates', async () => {
      const partialInput = { company_name: 'Partial Update' } as unknown as UpdateCompanySettingsRequest;
      mockSettingsService.updateCompanySettings.mockResolvedValue({
        companyName: 'Partial Update',
        companyInn: '1234567890',
        companyKpp: '123456789',
        companyAddress: 'Address',
        companyPhone: 'Phone',
        companyEmail: 'email@example.com',
        defaultPaymentTermsDays: 30,
        defaultVatRate: 20,
      });

      const result = await controller.updateCompanySettings(partialInput);

      expect(mockSettingsService.updateCompanySettings).toHaveBeenCalled();
      expect(result.company_name).toBe('Partial Update');
    });
  });
});