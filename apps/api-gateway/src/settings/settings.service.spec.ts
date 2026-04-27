import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  let service: SettingsService;

  const createMockClient = () => ({
    getCompanySettings: jest.fn(),
    setSetting: jest.fn(),
    updateCompanySettings: jest.fn(),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockClient = createMockClient();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: 'ORDER_PACKAGE', useValue: { getService: () => mockClient } },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});