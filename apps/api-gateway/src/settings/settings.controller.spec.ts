import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Reflector } from '@nestjs/core';

const mockSettingsService = {
  getCompanySettings: jest.fn(),
  updateCompanySettings: jest.fn(),
};

describe('SettingsController', () => {
  let controller: SettingsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [
        { provide: SettingsService, useValue: mockSettingsService },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RbacGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SettingsController>(SettingsController);
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

      const result = await controller.updateCompanySettings(dto);

      expect(mockSettingsService.updateCompanySettings).toHaveBeenCalledWith(dto);
      expect(result).toEqual(updatedSettings);
    });

    it('should return null on error', async () => {
      mockSettingsService.updateCompanySettings.mockResolvedValue(null);

      const result = await controller.updateCompanySettings({ companyName: 'Test' });

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

      const result = await controller.updateCompanySettings(dto);

      expect(result?.defaultVatRate).toBe(18);
    });
  });
});