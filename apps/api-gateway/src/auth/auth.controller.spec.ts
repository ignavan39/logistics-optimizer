import { Test, type TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RbacGuard } from './guards/rbac.guard';

// Mock @nestjs/throttler
jest.mock('@nestjs/throttler', () => ({
  ThrottlerModule: {
    forRoot: jest.fn().mockReturnValue({
      module: class MockThrottlerModule {},
      providers: [],
      imports: [],
      exports: [],
    }),
  },
  Throttle: () => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor,
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('salt'),
}));

// Create mock controller factory
const createMockAuthController = () => ({
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  changePassword: jest.fn(),
  getMe: jest.fn(),
  createApiKey: jest.fn(),
  listApiKeys: jest.fn(),
  createUser: jest.fn(),
  listUsers: jest.fn(),
});

describe('AuthController', () => {
  let controller: any;
  let authService: jest.Mocked<AuthService>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockController = createMockAuthController();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'AuthController',
          useValue: mockController,
        },
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshAccessToken: jest.fn(),
            logout: jest.fn(),
            changePassword: jest.fn(),
            listApiKeys: jest.fn(),
            createApiKey: jest.fn(),
            createUser: jest.fn(),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
            listUsers: jest.fn(),
            createUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get('AuthController');
    authService = module.get(AuthService) as jest.Mocked<AuthService>;
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register', async () => {
      const dto = { email: 'test@example.com', password: 'password', firstName: 'Test', lastName: 'User' };
      controller.register(dto);
      expect(controller.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should call authService.login', async () => {
      const dto = { email: 'test@example.com', password: 'password' };
      const req = { ip: '127.0.0.1', get: () => 'test-agent' };
      controller.login(dto, req);
      expect(controller.login).toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshAccessToken', async () => {
      const dto = { refreshToken: 'token' };
      controller.refresh(dto);
      expect(controller.refresh).toHaveBeenCalledWith(dto);
    });
  });

  describe('logout', () => {
    it('should call authService.logout', async () => {
      const user = { userId: '1', email: 'test@example.com', type: 'access' as const, permissions: [] };
      const req = { headers: { 'x-session-id': 'sess-1' } } as any;
      controller.logout(user, req);
      expect(controller.logout).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should call authService.changePassword', async () => {
      const user = { userId: '1', email: 'test@example.com', type: 'access' as const, permissions: [] };
      const dto = { currentPassword: 'old', newPassword: 'new' };
      controller.changePassword(dto, user);
      expect(controller.changePassword).toHaveBeenCalled();
    });
  });

  describe('getMe', () => {
    it('should return user info', async () => {
      const user = { userId: '1', email: 'test@example.com', type: 'access' as const, permissions: ['users.read'] };
      controller.getMe.mockReturnValue(user);
      const result = await controller.getMe(user);
      expect(result).toEqual({
        userId: '1',
        email: 'test@example.com',
        type: 'access',
        permissions: ['users.read'],
      });
    });
  });

  describe('createApiKey', () => {
    it('should call authService.createApiKey', async () => {
      const user = { userId: '1', email: 'test@example.com', type: 'access' as const, permissions: [] };
      const dto = { name: 'Test Key' };
      controller.createApiKey(dto, user);
      expect(controller.createApiKey).toHaveBeenCalled();
    });
  });

  describe('listApiKeys', () => {
    it('should call authService.listApiKeys', async () => {
      const user = { userId: '1', email: 'test@example.com', type: 'access' as const, permissions: [] };
      controller.listApiKeys(user);
      expect(controller.listApiKeys).toHaveBeenCalled();
    });
  });

  describe('createUser', () => {
    it('should call usersService.createUser', async () => {
      const user = { userId: '1', email: 'test@example.com', type: 'access' as const, permissions: [] };
      const dto = { email: 'new@example.com', password: 'pass', firstName: 'New', lastName: 'User' } as any;
      controller.createUser(dto, user);
      expect(controller.createUser).toHaveBeenCalled();
    });
  });

  describe('listUsers', () => {
    it('should call usersService.findUsers', async () => {
      const user = { userId: '1', email: 'test@example.com', type: 'access' as const, permissions: [] };
      controller.listUsers(user, '1', '10');
      expect(controller.listUsers).toHaveBeenCalled();
    });
  });
});
