import { CounterpartyService } from './counterparty.service';

describe.skip('CounterpartyService', () => {
  let service: CounterpartyService;
  
  const mockClient = {
    getCounterparty: jest.fn(),
    createCounterparty: jest.fn(),
    updateCounterparty: jest.fn(),
    listCounterparties: jest.fn(),
    createContract: jest.fn(),
    getContract: jest.fn(),
    updateContract: jest.fn(),
    listContracts: jest.fn(),
    getContractTariffs: jest.fn(),
    createContractTariff: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockClient.getCounterparty.mockReset();
    mockClient.createCounterparty.mockReset();
    mockClient.updateCounterparty.mockReset();
    mockClient.listCounterparties.mockReset();
    
    service = new CounterpartyService({} as any);
    (service as any).client = mockClient;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCounterparty()', () => {
    it('should return counterparty from gRPC', async () => {
      const rawResponse = { id: 'cp-1', name: 'Test Company', inn: '1234567890', type: 'carrier' };
      mockClient.getCounterparty.mockImplementation((_opts: any, callback: any) => {
        callback(null, rawResponse);
      });

      const result = await service.getCounterparty('cp-1');

      expect(mockClient.getCounterparty).toHaveBeenCalledWith({ id: 'cp-1' }, expect.any(Function));
      expect(result).toMatchObject({ id: 'cp-1', name: 'Test Company', inn: '1234567890' });
    });

    it('should return null on error', async () => {
      mockClient.getCounterparty.mockImplementation((_opts: any, callback: any) => {
        callback(new Error('Not found'), null);
      });

      const result = await service.getCounterparty('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('listCounterparties()', () => {
    it('should return list of counterparties', async () => {
      const items = [
        { id: 'cp-1', name: 'Company 1', inn: '1234567890' },
        { id: 'cp-2', name: 'Company 2', inn: '1234567891' },
      ];
      mockClient.listCounterparties.mockImplementation((_opts: any, callback: any) => {
        callback(null, { items });
      });

      const result = await service.listCounterparties({});

      expect(mockClient.listCounterparties).toHaveBeenCalled();
      expect(result).toEqual(items);
    });
  });
});