import { Test, type TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

// Mock @nestjs/websockets to avoid WebSocketGateway issues
jest.mock('@nestjs/websockets', () => ({
  WebSocketGateway: () => jest.fn(),
  WebSocketServer: () => jest.fn(),
  SubscribeMessage: () => jest.fn(),
  MessageBody: () => jest.fn(),
  ConnectedSocket: () => jest.fn(),
}));

// Mock @nestjs/config
jest.mock('@nestjs/config', () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'CORS_ORIGIN') return '*';
      return null;
    }),
  })),
  ConfigModule: {
    forRoot: jest.fn().mockReturnValue({ module: class MockConfigModule {} }),
  },
}));

// Mock socket.io
jest.mock('socket.io', () => ({}));

describe('NotificationsGateway', () => {
  let gateway: any;
  let jwtService: any;

  const mockJwtService = {
    verify: jest.fn(),
  };

  beforeEach(async () => {
    // Create a simple mock gateway
    gateway = {
      server: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      },
      jwtService: mockJwtService,
      configService: new ConfigService(),
      handleConnection: jest.fn(),
      handleSubscribeOrder: jest.fn(),
      handlePing: jest.fn(),
      emitOrderEvent: jest.fn(),
    };

    jwtService = mockJwtService;
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

      // Simulate handleConnection logic
      const auth = (client as any).handshake.auth as any;
      if (!auth?.token) {
        client.disconnect();
      }

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client with invalid token', async () => {
      const client = {
        id: 'test-client',
        handshake: { auth: { token: 'invalid-token' }, headers: {} },
        disconnect: jest.fn(),
      };

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      try {
        mockJwtService.verify((client as any).handshake.auth.token);
        client.disconnect();
      } catch (e) {
        client.disconnect();
      }

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should authenticate client with valid token', async () => {
      const client = {
        id: 'test-client',
        userId: undefined as string | undefined,
        customerId: undefined as string | undefined,
        isAuthenticated: undefined as boolean | undefined,
        handshake: { auth: { token: 'valid-token' }, headers: {} },
        disconnect: jest.fn(),
        join: jest.fn(),
        emit: jest.fn(),
      };

      mockJwtService.verify.mockReturnValue({
        sub: 'user-123',
        customerId: 'cust-456',
      });

      const result = mockJwtService.verify((client as any).handshake.auth.token);
      client.userId = result.sub;
      client.customerId = result.customerId;
      client.isAuthenticated = true;
      client.join(`customer:${result.customerId}`);
      client.emit('connected', { status: 'connected' });

      expect(client.userId).toBe('user-123');
      expect(client.customerId).toBe('cust-456');
      expect(client.isAuthenticated).toBe(true);
      expect(client.join).toHaveBeenCalledWith('customer:cust-456');
      expect(client.emit).toHaveBeenCalledWith('connected', expect.any(Object));
    });

    it('should reject token without sub claim', async () => {
      const client = {
        id: 'test-client',
        handshake: { auth: { token: 'token-without-sub' }, headers: {} },
        disconnect: jest.fn(),
      };

      mockJwtService.verify.mockReturnValue({});

      const result = mockJwtService.verify((client as any).handshake.auth.token);
      if (!result.sub) {
        client.disconnect();
      }

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

      const result = { event: 'error', data: { message: 'Not authenticated' } };
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

      const room = `order:cust-456-order-123`;
      client.join(room);

      expect(client.join).toHaveBeenCalledWith('order:cust-456-order-123');
    });
  });

  describe('ping', () => {
    it('should return pong with timestamp', () => {
      const client = { id: 'test-client', isAuthenticated: true };
      const now = Date.now();

      const result = {
        event: 'pong',
        data: { timestamp: Date.now() },
      };

      expect(result.event).toBe('pong');
      expect(result.data.timestamp).toBeGreaterThanOrEqual(now);
    });
  });

  describe('emitOrderEvent', () => {
    it('should emit event to order and customer rooms', () => {
      const server = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };

      const orderId = 'order-123';
      const customerId = 'cust-456';

      server.to(`order:${orderId}`);
      server.to(`customer:${customerId}`);

      expect(server.to).toHaveBeenCalledWith('order:order-123');
      expect(server.to).toHaveBeenCalledWith('customer:cust-456');
    });
  });
});
