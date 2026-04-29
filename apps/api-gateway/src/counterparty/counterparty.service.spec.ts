import { CounterpartyService } from './counterparty.service';
import { ConfigService } from '@nestjs/config';
import { ClientGrpc } from '@nestjs/microservices';

const mockGrpcClient = {
  getService: jest.fn().mockReturnValue({
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
  }),
};

const mockConfigService = {
  get: jest.fn(),
};

describe('CounterpartyService', () => {
  let service: CounterpartyService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    service = new CounterpartyService(
      mockGrpcClient as any,
    );
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCounterparty()', () => {
    it('should return counterparty from gRPC', async () => {
      const counterparty = { id: 'cp-1', name: 'Test Company', inn: '1234567890' };
      (mockGrpcClient.getService() as any).getCounterparty.mockResolvedValue(counterparty);

      const result = await service.getCounterparty('cp-1');

      expect((mockGrpcClient.getService() as any).getCounterparty).toHaveBeenCalledWith({ id: 'cp-1' });
      expect(result).toEqual(counterparty);
    });

    it('should return null on error', async () => {
      (mockGrpcClient.getService() as any).getCounterparty.mockRejectedValue(new Error('Not found'));

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
      (mockGrpcClient.getService() as any).listCounterparties.mockResolvedValue({ items: counterparties });

      const result = await service.listCounterparties();

      expect(result).toEqual(counterparties);
    });

    it('should return empty array when no items', async () => {
      (mockGrpcClient.getService() as any).listCounterparties.mockResolvedValue({ items: undefined });

      const result = await service.listCounterparties();

      expect(result).toEqual([]);
    });

    it('should pass filter params', async () => {
      (mockGrpcClient.getService() as any).listCounterparties.mockResolvedValue({ items: [] });

      await service.listCounterparties({ type: 'carrier', status: 'active' });

      expect((mockGrpcClient.getService() as any).listCounterparties).toHaveBeenCalledWith({
        type: 'carrier',
        status: 'active',
      });
    });
  });

  describe('createCounterparty()', () => {
    it('should create counterparty via gRPC', async () => {
      const input = { name: 'New Company', inn: '1234567890', type: 'carrier' };
      const created = { id: 'cp-new', ...input };
      (mockGrpcClient.getService() as any).createCounterparty.mockResolvedValue(created);

      const result = await service.createCounterparty(input);

      expect((mockGrpcClient.getService() as any).createCounterparty).toHaveBeenCalledWith(input);
      expect(result).toEqual(created);
    });

    it('should throw on error', async () => {
      (mockGrpcClient.getService() as any).createCounterparty.mockRejectedValue(new Error('Validation failed'));

      await expect(service.createCounterparty({ name: 'Test' })).rejects.toThrow();
    });
  });

  describe('updateCounterparty()', () => {
    it('should update counterparty via gRPC', async () => {
      const input = { id: 'cp-1', name: 'Updated Name' };
      const updated = { id: 'cp-1', name: 'Updated Name', inn: '1234567890' };
      (mockGrpcClient.getService() as any).updateCounterparty.mockResolvedValue(updated);

      const result = await service.updateCounterparty(input);

      expect((mockGrpcClient.getService() as any).updateCounterparty).toHaveBeenCalledWith(input);
      expect(result).toEqual(updated);
    });
  });

  describe('getContract()', () => {
    it('should return contract from gRPC', async () => {
      const contract = { id: 'contract-1', number: 'CON-001' };
      (mockGrpcClient.getService() as any).getContract.mockResolvedValue(contract);

      const result = await service.getContract('contract-1');

      expect((mockGrpcClient.getService() as any).getContract).toHaveBeenCalledWith({ id: 'contract-1' });
      expect(result).toEqual(contract);
    });

    it('should return null on error', async () => {
      (mockGrpcClient.getService() as any).getContract.mockRejectedValue(new Error('Not found'));

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
      (mockGrpcClient.getService() as any).listContracts.mockResolvedValue({ items: contracts });

      const result = await service.listContracts({ counterpartyId: 'cp-1' });

      expect(result).toEqual(contracts);
    });

    it('should return empty array when no items', async () => {
      (mockGrpcClient.getService() as any).listContracts.mockResolvedValue({ items: undefined });

      const result = await service.listContracts();

      expect(result).toEqual([]);
    });
  });

  describe('getContractTariffs()', () => {
    it('should return tariffs from gRPC', async () => {
      const tariffs = [
        { id: 'tariff-1', zone: 'moscow', pricePerKm: 50 },
        { id: 'tariff-2', zone: 'spb', pricePerKm: 70 },
      ];
      (mockGrpcClient.getService() as any).getContractTariffs.mockResolvedValue({ items: tariffs });

      const result = await service.getContractTariffs('contract-1');

      expect((mockGrpcClient.getService() as any).getContractTariffs).toHaveBeenCalledWith({ contractId: 'contract-1' });
      expect(result).toEqual(tariffs);
    });

    it('should return empty array on error', async () => {
      (mockGrpcClient.getService() as any).getContractTariffs.mockRejectedValue(new Error('Not found'));

      const result = await service.getContractTariffs('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('createContractTariff()', () => {
    it('should create tariff via gRPC', async () => {
      const input = { contractId: 'contract-1', zone: 'moscow', pricePerKm: 50 };
      const created = { id: 'tariff-new', ...input };
      (mockGrpcClient.getService() as any).createContractTariff.mockResolvedValue(created);

      const result = await service.createContractTariff(input);

      expect((mockGrpcClient.getService() as any).createContractTariff).toHaveBeenCalledWith(input);
      expect(result).toEqual(created);
    });
  });
});
