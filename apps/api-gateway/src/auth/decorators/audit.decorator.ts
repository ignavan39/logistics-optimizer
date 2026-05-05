import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';
export const AuditLog = (action: string, resource?: string) =>
  SetMetadata(AUDIT_KEY, { action, resource });

export interface AuditMetadata {
  action: string;
  resource?: string;
}