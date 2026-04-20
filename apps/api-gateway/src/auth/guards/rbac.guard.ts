import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RequestUser } from '../strategies/jwt.strategy';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: RequestUser = request.user;

    if (!user) {
      return false;
    }

    if (user.type === 'api-key') {
      return this.checkApiKeyPermissions(user, requiredPermissions);
    }

    return this.checkUserPermissions(user, requiredPermissions);
  }

  private checkUserPermissions(user: RequestUser, required: string[]): boolean {
    const userPermissions = new Set(user.permissions);
    return required.some((perm) => userPermissions.has(perm));
  }

  private checkApiKeyPermissions(user: RequestUser, required: string[]): boolean {
    return required.some((perm) => user.permissions.includes(perm));
  }
}