import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { apiFetchWithAuth as apiFetch } from '@/lib/auth'
import type { AuditLogsResponse } from '@/types'

interface AuditFilters {
  userId: string
  action: string
  resource: string
  from: string
  to: string
}

export function AuditTab() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<AuditFilters>({
    userId: '',
    action: '',
    resource: '',
    from: '',
    to: '',
  })

  const { data, isLoading } = useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', page, filters],
    queryFn: () => {
      const params = new URLSearchParams()
      params.append('limit', '20')
      params.append('offset', String((page - 1) * 20))
      if (filters.userId) params.append('userId', filters.userId)
      if (filters.action) params.append('action', filters.action)
      if (filters.resource) params.append('resource', filters.resource)
      if (filters.from) params.append('from', filters.from)
      if (filters.to) params.append('to', filters.to)
      return apiFetch(`/admin/audit-logs?${params.toString()}`)
    },
  })

  const logs = data?.logs ?? []
  const totalPages = data ? Math.ceil(data.total / 20) : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-4">
        <input
          type="text"
          placeholder="User ID"
          value={filters.userId}
          onChange={e => setFilters({ ...filters, userId: e.target.value })}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
        />
        <input
          type="text"
          placeholder="Действие"
          value={filters.action}
          onChange={e => setFilters({ ...filters, action: e.target.value })}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
        />
        <input
          type="text"
          placeholder="Ресурс"
          value={filters.resource}
          onChange={e => setFilters({ ...filters, resource: e.target.value })}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
        />
        <input
          type="date"
          value={filters.from}
          onChange={e => setFilters({ ...filters, from: e.target.value })}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
        />
        <input
          type="date"
          value={filters.to}
          onChange={e => setFilters({ ...filters, to: e.target.value })}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
        />
      </div>

      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin text-accent-lavender" />
      ) : logs.length === 0 ? (
        <div className="text-text-muted text-center py-8">Нет записей</div>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-text-secondary font-medium text-sm">Время</th>
                <th className="text-left p-3 text-text-secondary font-medium text-sm">Пользователь</th>
                <th className="text-left p-3 text-text-secondary font-medium text-sm">Действие</th>
                <th className="text-left p-3 text-text-secondary font-medium text-sm">Ресурс</th>
                <th className="text-left p-3 text-text-secondary font-medium text-sm">ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-border hover:bg-surface-hover">
                  <td className="p-3 text-text-primary text-sm">
                    {new Date(log.createdAt).toLocaleString('ru-RU')}
                  </td>
                  <td className="p-3 text-text-secondary text-sm">{log.userId?.slice(0, 8) || '-'}</td>
                  <td className="p-3 text-text-primary text-sm">{log.action}</td>
                  <td className="p-3 text-text-secondary text-sm">{log.resource}</td>
                  <td className="p-3 text-text-muted text-sm font-mono">{log.resourceId?.slice(0, 8) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-muted">Страница {page} из {totalPages}</div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => p - 1)}
              disabled={page <= 1}
              className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50"
            >
              Назад
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50"
            >
              Вперёд
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
