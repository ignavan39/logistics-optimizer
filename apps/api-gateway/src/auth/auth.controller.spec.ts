import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RbacGuard } from './guards/rbac.guard';
import { Reflector } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshAccessToken: jest.fn(),
            logout: jest.fn(),
            changePassword: jest.fn(),
            getUserRoles: jest.fn(),
            createApiKey: jest.fn(),
          },
        },
        JwtAuthGuard,
        RbacGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
      imports: [ThrottlerModule.forRoot()],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

   describe('register', () => {
       it('should call authService.register', async () => {
         const dto = { email: 'test@example.com', password: 'password', firstName: 'Test', lastName: 'User' };
         await controller.register(dto);
         expect(authService.register).toHaveBeenCalledWith(dto);
       });
    });

    describe('login', () => {
       it('should call authService.login', async () => {
         const dto = { email: 'test@example.com', password: 'password' };
         const req = { ip: '127.0.0.1', get: () => 'test-agent' };
         await controller.login(dto, req as any);
         expect(authService.login).toHaveBeenCalledWith(dto, '127.0.0.1', 'test-agent');
       });
    });

   describe('refresh', () => {
     it('should call authService.refreshAccessToken', async () => {
       const dto = { refreshToken: 'token' };
       await controller.refresh(dto);
       expect(authService.refreshAccessToken).toHaveBeenCalledWith('token');
     });
   });

    describe('logout', () => {
      it('should call authService.logout', async () => {
        const user = { userId: '1', email: 'test@example.com', type: 'access' as const, permissions: [], sessionId: 'sess-1' };
        await controller.logout(user);
        expect(authService.logout).toHaveBeenCalledWith('1', 'sess-1');
      });
    });

    describe('changePassword', () => {
      it('should call authService.changePassword', async () => {
        const user = { userId: '1', email: 'test@example.com', type: 'access' as const, permissions: [] };
        const dto = { currentPassword: 'old', newPassword: 'new' };
        await controller.changePassword(user, dto);
        expect(authService.changePassword).toHaveBeenCalledWith('1', 'old', 'new');
      });
    });

    describe('getMe', () => {
      it('should return user info', async () => {
        const user = { userId: '1', email: 'test@example.com', type: 'access' as const, permissions: ['users.read'] };
        const result = await controller.getMe(user);
        expect(result).toEqual({
          userId: '1',
          email: 'test@example.com',
          type: 'access',
          permissions: ['users.read'],
        });
      });
    });

    describe('getUserRoles', () => {
      it('should call authService.getUserRoles', async () => {
        const user = { userId: '1', email: 'test@example.com', type: 'access' as const, permissions: [] };
        await controller.getUserRoles(user);
        expect(authService.getUserRoles).toHaveBeenCalledWith('1');
      });

      it('should be a function', () => {
        expect(typeof controller.getUserRoles).toBe('function');
      });
    });

    describe('createApiKey', () => {
      it('should call authService.createApiKey', async () => {
        const user = { userId: '1', email: 'test@example.com', type: 'access' as const, permissions: [] };
        const dto = { name: 'Test Key' };
        await controller.createApiKey(user, dto);
        expect(authService.createApiKey).toHaveBeenCalledWith('1', dto);
      });
    });
});