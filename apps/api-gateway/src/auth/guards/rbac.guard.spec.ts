import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacGuard } from './rbac.guard';

describe('RbacGuard', () => {
  let guard: RbacGuard;
  let mockReflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    mockReflector = { getAllAndOverride: jest.fn() };
    guard = new RbacGuard();
    (guard as any).reflector = mockReflector;
  });

  const createMockContext = (user: any, permissions: string[] = []): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { ...user, permissions },
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should allow when no permissions required', () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);
      const context = createMockContext({ userId: 'user-1', permissions: [] });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw when no user in request', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['orders.read']);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({}),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow when user has required permission', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['orders.read']);
      const context = createMockContext({ userId: 'user-1' }, ['orders.read', 'orders.create']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw when user lacks required permission', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['orders.read']);
      const context = createMockContext({ userId: 'user-1' }, ['orders.create']);
      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow when user has wildcard permission orders.*', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['orders.read']);
      const context = createMockContext({ userId: 'user-1' }, ['orders.*']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow when user has wildcard permission resource.*', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['vehicles.read']);
      const context = createMockContext({ userId: 'user-1' }, ['vehicles.*']);
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should check api-key type permissions', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['orders.read']);
      const context = createMockContext(
        { userId: 'user-1', type: 'api-key' },
        ['orders.read'],
      );
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should support multiple required permissions (some match)', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['orders.read', 'vehicles.read']);
      const context = createMockContext({ userId: 'user-1' }, ['orders.read']);
      expect(guard.canActivate(context)).toBe(true);
    });
  });
});