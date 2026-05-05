import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

interface AuditLogInput {
  userId?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private dataSource: DataSource) {}

  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.dataSource
        .getRepository(AuditLog)
        .insert(input as AuditLog);
    } catch (error) {
      console.error('[AuditService] Failed to write audit log:', error);
    }
  }

  async logFromRequest(
    action: string,
    req: { user?: { userId?: string }; ip?: string; headers?: { [key: string]: string } },
    resource?: string,
    resourceId?: string,
    changes?: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      userId: req.user?.userId,
      action,
      resource,
      resourceId,
      changes,
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }
}