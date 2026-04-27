export interface AuditLog {
  id: string
  userId: string
  userEmail?: string
  action: string
  resource: string
  resourceId?: string
  changes?: Record<string, unknown>
  ipAddress?: string
  createdAt: string
}

export interface AuditLogsResponse {
  logs: AuditLog[]
  total: number
  limit: number
  offset: number
}

export interface AuditLogsQuery {
  userId?: string
  action?: string
  resource?: string
  from?: string
  to?: string
  limit?: number
  offset?: number
}
