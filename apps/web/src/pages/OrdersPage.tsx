import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { Button, PageLoader } from '@/components/ui'
import { OrderCard } from '@/features/orders'
import { Order, ORDER_STATUS_LABELS } from '@/types'
import { Package } from 'lucide-react'
import { Badge, Modal } from '@/components/ui'

export function OrdersPage() {
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery<{ orders: Order[]; total: number }>({
    queryKey: ['orders', page],
    queryFn: () => apiGet<{ orders: Order[]; total: number }>('/orders', { page, limit: 20 }),
    retry: 1,
  })

  if (isLoading) return <PageLoader />
  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-text-muted">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Сервис недоступен</p>
        </div>
      </div>
    )
  }

  const order = data?.orders.find(o => o.id === selectedId)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Заказы</h1>
      </div>

      {!data?.orders.length ? (
        <div className="text-center py-12 text-text-muted">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Нет заказов</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.orders.map(orderItem => (
            <OrderCard key={orderItem.id} order={orderItem} onClick={() => setSelectedId(orderItem.id)} />
          ))}
        </div>
      )}

      {data && data.total > 20 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-text-muted">Страница {page}</div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Назад</Button>
            <Button variant="secondary" size="sm" disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)}>Вперёд</Button>
          </div>
        </div>
      )}

      <Modal isOpen={!!selectedId} onClose={() => setSelectedId(null)} title={`Заказ ${selectedId?.slice(0, 8)}`}>
        {order && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge label={ORDER_STATUS_LABELS[order.status]} />
            </div>
            <p className="text-text-secondary">{order.origin?.address} → {order.destination?.address}</p>
            <p className="text-text-muted">{order.weightKg} кг, {order.volumeM3} м³</p>
          </div>
        )}
      </Modal>
    </div>
  )
}