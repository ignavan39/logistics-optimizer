import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { SettingsService, CompanySettings } from './settings.service';
import { SettingEntity, SettingKey } from './entities/setting.entity';

const mockRepo = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

describe('SettingsService', () => {
  let service: SettingsService;

  const mockDataSource = {
    getRepository: jest.fn(() => mockRepo),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get()', () => {
    it('should return value when setting exists', async () => {
      mockRepo.findOne.mockResolvedValue({ key: 'company_name', value: 'Test Company' });

      const result = await service.get('company_name');

      expect(result).toBe('Test Company');
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { key: 'company_name' } });
    });

    it('should return null when setting not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.get('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('set()', () => {
    it('should create new setting when key does not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockReturnValue({ key: 'company_name', value: 'New Company' });
      mockRepo.save.mockResolvedValue({ key: 'company_name', value: 'New Company' });

      const result = await service.set('company_name', 'New Company');

      expect(mockRepo.create).toHaveBeenCalledWith({ key: 'company_name', value: 'New Company' });
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.value).toBe('New Company');
    });

    it('should update existing setting', async () => {
      const existing = { key: 'company_name', value: 'Old Company' };
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockResolvedValue({ ...existing, value: 'Updated Company' });

      const result = await service.set('company_name', 'Updated Company');

      expect(existing.value).toBe('Updated Company');
      expect(mockRepo.save).toHaveBeenCalledWith(existing);
    });
  });

  describe('getAll()', () => {
    it('should return only requested keys', async () => {
      mockRepo.find.mockResolvedValue([
        { key: SettingKey.COMPANY_NAME, value: 'Company A' },
        { key: SettingKey.COMPANY_INN, value: '1234567890' },
      ]);

      const result = await service.getAll(['company_name', 'company_inn', 'nonexistent']);

      expect(result).toEqual({
        'company_name': 'Company A',
        'company_inn': '1234567890',
      });
    });

    it('should return empty object when no keys found', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.getAll(['nonexistent']);

      expect(result).toEqual({});
    });
  });

  describe('getCompanySettings()', () => {
    it('should return all company settings with defaults', async () => {
      mockRepo.find.mockResolvedValue([
        { key: SettingKey.COMPANY_NAME, value: 'Test Company' },
        { key: SettingKey.COMPANY_INN, value: '1234567890' },
        { key: SettingKey.COMPANY_KPP, value: '123456789' },
        { key: SettingKey.COMPANY_ADDRESS, value: 'Test Address' },
        { key: SettingKey.COMPANY_PHONE, value: '+7 123 456-78-90' },
        { key: SettingKey.COMPANY_EMAIL, value: 'test@example.com' },
        { key: SettingKey.DEFAULT_PAYMENT_TERMS_DAYS, value: '45' },
        { key: SettingKey.DEFAULT_VAT_RATE, value: '18' },
      ]);

      const result = await service.getCompanySettings();

      expect(result).toEqual({
        companyName: 'Test Company',
        companyInn: '1234567890',
        companyKpp: '123456789',
        companyAddress: 'Test Address',
        companyPhone: '+7 123 456-78-90',
        companyEmail: 'test@example.com',
        defaultPaymentTermsDays: 45,
        defaultVatRate: 18,
      });
    });

    it('should use defaults when settings are missing', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.getCompanySettings();

      expect(result).toEqual({
        companyName: 'Company',
        companyInn: '',
        companyKpp: '',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
        defaultPaymentTermsDays: 30,
        defaultVatRate: 20,
      });
    });

    it('should parse numeric values correctly', async () => {
      mockRepo.find.mockResolvedValue([
        { key: SettingKey.DEFAULT_PAYMENT_TERMS_DAYS, value: '60' },
        { key: SettingKey.DEFAULT_VAT_RATE, value: '10' },
      ]);

      const result = await service.getCompanySettings();

      expect(result.defaultPaymentTermsDays).toBe(60);
      expect(result.defaultVatRate).toBe(10);
    });
  });

  describe('updateCompanySettings()', () => {
    it('should update single field', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockImplementation((data) => data);
      mockRepo.save.mockImplementation((data) => data);

      mockRepo.find.mockResolvedValue([
        { key: SettingKey.COMPANY_NAME, value: 'New Name' },
        { key: SettingKey.COMPANY_INN, value: '' },
        { key: SettingKey.COMPANY_KPP, value: '' },
        { key: SettingKey.COMPANY_ADDRESS, value: '' },
        { key: SettingKey.COMPANY_PHONE, value: '' },
        { key: SettingKey.COMPANY_EMAIL, value: '' },
        { key: SettingKey.DEFAULT_PAYMENT_TERMS_DAYS, value: '30' },
        { key: SettingKey.DEFAULT_VAT_RATE, value: '20' },
      ]);

      const result = await service.updateCompanySettings({ companyName: 'New Name' });

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { key: SettingKey.COMPANY_NAME } });
      expect(result.companyName).toBe('New Name');
    });

    it('should update multiple fields', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockImplementation((data) => data);
      mockRepo.save.mockImplementation((data) => data);

      mockRepo.find.mockResolvedValue([
        { key: SettingKey.COMPANY_NAME, value: 'New Name' },
        { key: SettingKey.COMPANY_INN, value: '9999999999' },
        { key: SettingKey.COMPANY_KPP, value: '' },
        { key: SettingKey.COMPANY_ADDRESS, value: '' },
        { key: SettingKey.COMPANY_PHONE, value: '' },
        { key: SettingKey.COMPANY_EMAIL, value: '' },
        { key: SettingKey.DEFAULT_PAYMENT_TERMS_DAYS, value: '90' },
        { key: SettingKey.DEFAULT_VAT_RATE, value: '20' },
      ]);

      const result = await service.updateCompanySettings({
        companyName: 'New Name',
        companyInn: '9999999999',
        defaultPaymentTermsDays: 90,
      });

      expect(result.companyName).toBe('New Name');
      expect(result.companyInn).toBe('9999999999');
      expect(result.defaultPaymentTermsDays).toBe(90);
    });

    it('should return updated company settings', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockImplementation((data) => data);
      mockRepo.save.mockImplementation((data) => data);

      mockRepo.find.mockResolvedValue([
        { key: SettingKey.COMPANY_NAME, value: 'Updated' },
        { key: SettingKey.COMPANY_INN, value: '' },
        { key: SettingKey.COMPANY_KPP, value: '' },
        { key: SettingKey.COMPANY_ADDRESS, value: '' },
        { key: SettingKey.COMPANY_PHONE, value: '' },
        { key: SettingKey.COMPANY_EMAIL, value: '' },
        { key: SettingKey.DEFAULT_PAYMENT_TERMS_DAYS, value: '30' },
        { key: SettingKey.DEFAULT_VAT_RATE, value: '20' },
      ]);

      const result = await service.updateCompanySettings({ companyName: 'Updated' });

      expect(result.companyName).toBe('Updated');
    });

    it('should convert numeric values to string', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockImplementation((data) => data);
      mockRepo.save.mockImplementation((data) => data);

      mockRepo.find.mockResolvedValue([
        { key: SettingKey.COMPANY_NAME, value: '' },
        { key: SettingKey.COMPANY_INN, value: '' },
        { key: SettingKey.COMPANY_KPP, value: '' },
        { key: SettingKey.COMPANY_ADDRESS, value: '' },
        { key: SettingKey.COMPANY_PHONE, value: '' },
        { key: SettingKey.COMPANY_EMAIL, value: '' },
        { key: SettingKey.DEFAULT_PAYMENT_TERMS_DAYS, value: '45' },
        { key: SettingKey.DEFAULT_VAT_RATE, value: '15' },
      ]);

      await service.updateCompanySettings({
        defaultPaymentTermsDays: 45,
        defaultVatRate: 15,
      });

      expect(mockRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ value: '45' }),
      );
    });
  });

  describe('seedDefaults()', () => {
    it('should not overwrite existing settings', async () => {
      mockRepo.findOne.mockResolvedValue({ key: SettingKey.COMPANY_NAME, value: 'Existing' });
      mockRepo.create.mockImplementation((data) => data);

      await service.seedDefaults();

      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('should create new settings when not exist', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.create.mockImplementation((data) => data);
      mockRepo.save.mockImplementation((data) => data);

      await service.seedDefaults();

      expect(mockRepo.save).toHaveBeenCalledTimes(8);
    });
  });
});