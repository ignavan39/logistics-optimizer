import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { PageLoader, Modal, Badge } from '@/components/ui'
import { type DispatchSaga, SAGA_STATUS_LABELS, SAGA_STATUS_COLORS } from '@/types'
import { Activity } from 'lucide-react'

export function DispatchPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery<{ sagas: DispatchSaga[] }>({
    queryKey: ['dispatch-sagas'],
    queryFn: () => apiGet<{ sagas: DispatchSaga[] }>('/dispatch'),
    retry: 1,
    refetchInterval: 5000,
  })

  if (isLoading) return <PageLoader />
  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-text-muted">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Сервис недоступен</p>
        </div>
      </div>
    )
  }

  const saga = data?.sagas.find(s => s.id === selectedId)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Dispatch</h1>
      </div>

      {!data?.sagas.length ? (
        <div className="text-center py-12 text-text-muted">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Нет активных dispatch</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.sagas.map(s => (
            <div key={s.id} className="bg-surface rounded-xl border border-border p-4 hover:bg-surface-hover cursor-pointer" onClick={() => { setSelectedId(s.id); }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-text-primary">{s.id.slice(0, 8)}</p>
                  <p className="text-sm text-text-secondary">Заказ: {s.orderId.slice(0, 8)}</p>
                </div>
                <Badge label={SAGA_STATUS_LABELS[s.status]} color={SAGA_STATUS_COLORS[s.status]} />
              </div>
              {s.error && <p className="text-status-error text-sm mt-2">{s.error}</p>}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!selectedId} onClose={() => { setSelectedId(null); }} title={`Dispatch ${selectedId?.slice(0, 8)}`}>
        {saga && (
          <div className="space-y-3">
            <p className="text-text-secondary">Заказ: {saga.orderId}</p>
            <p className="text-text-muted">Статус: {SAGA_STATUS_LABELS[saga.status]}</p>
            {saga.steps.length > 0 && (
              <div className="space-y-2 mt-4">
                {saga.steps.map(step => (
                  <div key={step.name} className="flex items-center gap-2">
                    <Badge label={step.status} color={step.status === 'COMPLETED' ? 'success' : step.status === 'FAILED' ? 'error' : step.status === 'RUNNING' ? 'sky' : 'muted'} />
                    <span className="text-text-primary">{step.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}