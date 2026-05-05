import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { AUDIT_KEY, AuditMetadata } from '../decorators/audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private dataSource: DataSource,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();

    // Get audit metadata from decorator
    const auditMeta = this.reflector.getAllAndOverride<AuditMetadata>(AUDIT_KEY, [
      handler,
      context.getClass(),
    ]);

    // Only audit POST/PUT/DELETE methods
    const method = request.method;
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    // Determine action
    let action = auditMeta?.action;
    if (!action) {
      const path = request.route?.path?.replace(/\//g, '.') || 'unknown';
      action = `${method.toLowerCase()}.${path}`;
    }

    const resource = auditMeta?.resource || request.route?.path?.split('/').filter(Boolean)[0] || 'unknown';
    const user = request.user as { userId?: string } | undefined;
    const ipAddress = request.ip || request.connection?.remoteAddress;
    const userAgent = request.headers?.['user-agent'];

    return next.handle().pipe(
      tap({
        next: async (responseBody) => {
          // Try to get resourceId from response
          let resourceId: string | undefined;
          if (responseBody && typeof responseBody === 'object') {
            const body = responseBody as { id?: string; orderId?: string; userId?: string };
            resourceId = body.id || body.orderId || body.userId;
          }

          try {
            await this.dataSource.getRepository(AuditLog).insert({
              userId: user?.userId,
              action,
              resource,
              resourceId,
              ipAddress: ipAddress as string,
              userAgent: userAgent as string,
            } as AuditLog);
          } catch (error) {
            console.error('[AuditInterceptor] Failed to write audit log:', error);
          }
        },
        error: async (error) => {
          console.error('[AuditInterceptor] Request failed:', error.message);
        },
      }),
    );
  }
}