import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let jwtService: JwtService;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should disconnect client without token', async () => {
      const client = {
        id: 'test-client',
        handshake: { auth: {}, headers: {} },
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client with invalid token', async () => {
      const client = {
        id: 'test-client',
        handshake: {
          auth: { token: 'invalid-token' },
          headers: {},
        },
        disconnect: jest.fn(),
        join: jest.fn(),
        emit: jest.fn(),
      };

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should authenticate client with valid token', async () => {
      const client = {
        id: 'test-client',
        userId: undefined as string | undefined,
        customerId: undefined as string | undefined,
        isAuthenticated: undefined as boolean | undefined,
        handshake: {
          auth: { token: 'valid-token' },
          headers: {},
        },
        disconnect: jest.fn(),
        join: jest.fn(),
        emit: jest.fn(),
      };

      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        customerId: 'cust-456',
      });

      await gateway.handleConnection(client as any);

      expect(client.userId).toBe('user-123');
      expect(client.customerId).toBe('cust-456');
      expect(client.isAuthenticated).toBe(true);
      expect(client.join).toHaveBeenCalledWith('customer:cust-456');
      expect(client.emit).toHaveBeenCalledWith('connected', expect.any(Object));
    });

    it('should reject token without sub claim', async () => {
      const client = {
        id: 'test-client',
        handshake: {
          auth: { token: 'token-without-sub' },
          headers: {},
        },
        disconnect: jest.fn(),
      };

      mockJwtService.verify.mockReturnValue({});

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('subscribe:order', () => {
    it('should return error if not authenticated', () => {
      const client = {
        id: 'test-client',
        isAuthenticated: false,
        join: jest.fn(),
      };

      const result = gateway.handleSubscribeOrder('order-123', client as any);

      expect(result.event).toBe('error');
      expect(client.join).not.toHaveBeenCalled();
    });

    it('should allow subscription if authenticated', () => {
      const client = {
        id: 'test-client',
        userId: 'user-123',
        customerId: 'cust-456',
        isAuthenticated: true,
        join: jest.fn(),
      };

      const result = gateway.handleSubscribeOrder('cust-456-order-123', client as any);

      expect(result.event).toBe('subscribed');
      expect(client.join).toHaveBeenCalledWith('order:cust-456-order-123');
    });
  });

  describe('ping', () => {
    it('should return pong with timestamp', () => {
      const client = { id: 'test-client', isAuthenticated: true };
      const now = Date.now();

      const result = gateway.handlePing(client as any) as { event: string; data: { timestamp: number } };

      expect(result.event).toBe('pong');
      expect(result.data.timestamp).toBeGreaterThanOrEqual(now);
    });
  });

  describe('emitOrderEvent', () => {
    it('should emit event to order and customer rooms', () => {
      const mockTo = jest.fn().mockReturnValue({ emit: jest.fn() });
      gateway['server'] = { to: mockTo } as any;

      gateway.emitOrderEvent('order-123', 'order.updated', {
        orderId: 'order-123',
        customerId: 'cust-456',
        status: 'assigned',
      });

      expect(mockTo).toHaveBeenCalledWith('order:order-123');
      expect(mockTo).toHaveBeenCalledWith('customer:cust-456');
    });
  });
});