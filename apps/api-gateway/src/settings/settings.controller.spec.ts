import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

const mockSettingsService = {
  getCompanySettings: jest.fn(),
  updateCompanySettings: jest.fn(),
};

describe('SettingsController', () => {
  let controller: SettingsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new SettingsController(
      mockSettingsService as any,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('GET /settings/company', () => {
    it('should return company settings', async () => {
      const settings = {
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
      expect(result).toEqual(settings);
    });

    it('should return null when settings not found', async () => {
      mockSettingsService.getCompanySettings.mockResolvedValue(null);

      const result = await controller.getCompanySettings();

      expect(result).toBeNull();
    });
  });

  describe('PUT /settings/company', () => {
    it('should update company settings', async () => {
      const dto = {
        companyName: 'New Company',
        companyInn: '9999999999',
        defaultPaymentTermsDays: 45,
      };
      const updatedSettings = {
        companyName: 'New Company',
        companyInn: '9999999999',
        companyKpp: '123456789',
        companyAddress: 'Test Address',
        companyPhone: '+7 123 456-78-90',
        companyEmail: 'test@example.com',
        defaultPaymentTermsDays: 45,
        defaultVatRate: 20,
      };
      mockSettingsService.updateCompanySettings.mockResolvedValue(updatedSettings);

      const result = await controller.updateCompanySettings(dto as any);

      expect(mockSettingsService.updateCompanySettings).toHaveBeenCalledWith(dto);
      expect(result).toEqual(updatedSettings);
    });

    it('should return null on error', async () => {
      mockSettingsService.updateCompanySettings.mockResolvedValue(null);

      const result = await controller.updateCompanySettings({ companyName: 'Test' } as any);

      expect(result).toBeNull();
    });

    it('should handle partial update', async () => {
      const dto = { defaultVatRate: 18 };
      const updatedSettings = {
        companyName: 'Test Company',
        companyInn: '1234567890',
        companyKpp: '123456789',
        companyAddress: 'Test Address',
        companyPhone: '+7 123 456-78-90',
        companyEmail: 'test@example.com',
        defaultPaymentTermsDays: 30,
        defaultVatRate: 18,
      };
      mockSettingsService.updateCompanySettings.mockResolvedValue(updatedSettings);

      const result = await controller.updateCompanySettings(dto as any);

      expect(result?.defaultVatRate).toBe(18);
    });
  });
});
