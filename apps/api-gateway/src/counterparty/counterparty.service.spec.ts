import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CounterpartyService } from './counterparty.service';

const mockClient = {
  createCounterparty: jest.fn(),
  getCounterparty: jest.fn(),
  updateCounterparty: jest.fn(),
  listCounterparties: jest.fn(),
  createContract: jest.fn(),
  getContract: jest.fn(),
  updateContract: jest.fn(),
  listContracts: jest.fn(),
  getContractTariffs: jest.fn(),
  createContractTariff: jest.fn(),
};

describe('CounterpartyService', () => {
  let service: CounterpartyService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockGrpcClient = {
      getService: jest.fn().mockReturnValue(mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CounterpartyService,
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: 'COUNTERPARTY_PACKAGE', useValue: mockGrpcClient },
      ],
    }).compile();

    service = module.get<CounterpartyService>(CounterpartyService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCounterparty()', () => {
    it('should return counterparty from gRPC', async () => {
      const counterparty = { id: 'cp-1', name: 'Test Company', inn: '1234567890' };
      mockClient.getCounterparty.mockResolvedValue(counterparty);

      const result = await service.getCounterparty('cp-1');

      expect(mockClient.getCounterparty).toHaveBeenCalledWith({ id: 'cp-1' });
      expect(result).toEqual(counterparty);
    });

    it('should return null on error', async () => {
      mockClient.getCounterparty.mockRejectedValue(new Error('Not found'));

      const result = await service.getCounterparty('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listCounterparties()', () => {
    it('should return list of counterparties', async () => {
      const counterparties = [
        { id: 'cp-1', name: 'Company A' },
        { id: 'cp-2', name: 'Company B' },
      ];
      mockClient.listCounterparties.mockResolvedValue({ items: counterparties });

      const result = await service.listCounterparties();

      expect(result).toEqual(counterparties);
    });

    it('should return empty array when no items', async () => {
      mockClient.listCounterparties.mockResolvedValue({ items: undefined });

      const result = await service.listCounterparties();

      expect(result).toEqual([]);
    });

    it('should pass filter params', async () => {
      mockClient.listCounterparties.mockResolvedValue({ items: [] });

      await service.listCounterparties({ type: 'carrier', status: 'active' });

      expect(mockClient.listCounterparties).toHaveBeenCalledWith({
        type: 'carrier',
        status: 'active',
      });
    });
  });

  describe('createCounterparty()', () => {
    it('should create counterparty via gRPC', async () => {
      const input = { name: 'New Company', inn: '1234567890', type: 'carrier' };
      const created = { id: 'cp-new', ...input };
      mockClient.createCounterparty.mockResolvedValue(created);

      const result = await service.createCounterparty(input);

      expect(mockClient.createCounterparty).toHaveBeenCalledWith(input);
      expect(result).toEqual(created);
    });

    it('should throw on error', async () => {
      mockClient.createCounterparty.mockRejectedValue(new Error('Validation failed'));

      await expect(service.createCounterparty({ name: 'Test' })).rejects.toThrow();
    });
  });

  describe('updateCounterparty()', () => {
    it('should update counterparty via gRPC', async () => {
      const input = { id: 'cp-1', name: 'Updated Name' };
      const updated = { id: 'cp-1', name: 'Updated Name', inn: '1234567890' };
      mockClient.updateCounterparty.mockResolvedValue(updated);

      const result = await service.updateCounterparty(input);

      expect(mockClient.updateCounterparty).toHaveBeenCalledWith(input);
      expect(result).toEqual(updated);
    });
  });

  describe('getContract()', () => {
    it('should return contract from gRPC', async () => {
      const contract = { id: 'contract-1', number: 'CON-001' };
      mockClient.getContract.mockResolvedValue(contract);

      const result = await service.getContract('contract-1');

      expect(mockClient.getContract).toHaveBeenCalledWith({ id: 'contract-1' });
      expect(result).toEqual(contract);
    });

    it('should return null on error', async () => {
      mockClient.getContract.mockRejectedValue(new Error('Not found'));

      const result = await service.getContract('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listContracts()', () => {
    it('should return list of contracts', async () => {
      const contracts = [
        { id: 'contract-1', number: 'CON-001' },
        { id: 'contract-2', number: 'CON-002' },
      ];
      mockClient.listContracts.mockResolvedValue({ items: contracts });

      const result = await service.listContracts({ counterpartyId: 'cp-1' });

      expect(result).toEqual(contracts);
    });

    it('should return empty array when no items', async () => {
      mockClient.listContracts.mockResolvedValue({ items: undefined });

      const result = await service.listContracts();

      expect(result).toEqual([]);
    });
  });

  describe('getContractTariffs()', () => {
    it('should return tariffs from gRPC', async () => {
      const tariffs = [
        { id: 'tariff-1', zone: 'moscow', pricePerKm: 50 },
        { id: 'tariff-2', zone: 'spbu', pricePerKm: 70 },
      ];
      mockClient.getContractTariffs.mockResolvedValue({ items: tariffs });

      const result = await service.getContractTariffs('contract-1');

      expect(mockClient.getContractTariffs).toHaveBeenCalledWith({ contractId: 'contract-1' });
      expect(result).toEqual(tariffs);
    });

    it('should return empty array on error', async () => {
      mockClient.getContractTariffs.mockRejectedValue(new Error('Not found'));

      const result = await service.getContractTariffs('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('createContractTariff()', () => {
    it('should create tariff via gRPC', async () => {
      const input = { contractId: 'contract-1', zone: 'moscow', pricePerKm: 50 };
      const created = { id: 'tariff-new', ...input };
      mockClient.createContractTariff.mockResolvedValue(created);

      const result = await service.createContractTariff(input);

      expect(mockClient.createContractTariff).toHaveBeenCalledWith(input);
      expect(result).toEqual(created);
    });
  });
});