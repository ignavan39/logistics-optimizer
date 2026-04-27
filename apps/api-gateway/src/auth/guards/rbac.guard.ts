import { Injectable, type CanActivate, type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { type Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { type RequestUser } from '../strategies/jwt.strategy';

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
      throw new ForbiddenException('User not authenticated');
    }

    let hasPermission = false;
    if (user.type === 'api-key') {
      hasPermission = this.checkApiKeyPermissions(user, requiredPermissions);
    } else {
      hasPermission = this.checkUserPermissions(user, requiredPermissions);
    }

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  private checkUserPermissions(user: RequestUser, required: string[]): boolean {
    const userPermissions = new Set(user.permissions);
    return required.some((perm) => this.hasPermission(userPermissions, perm));
  }

  private checkApiKeyPermissions(user: RequestUser, required: string[]): boolean {
    const apiPermissions = new Set(user.permissions);
    return required.some((perm) => this.hasPermission(apiPermissions, perm));
  }

  private hasPermission(userPermissions: Set<string>, required: string): boolean {
    if (userPermissions.has(required)) {
      return true;
    }
    const [resource] = required.split('.');
    for (const perm of userPermissions) {
      if (perm === `${resource}.*`) {
        return true;
      }
      if (perm.endsWith('.*') && perm.startsWith(`${resource}.`)) {
        return true;
      }
    }
    return false;
  }
}