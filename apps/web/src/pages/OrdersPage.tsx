import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/utils'
import { Package, Plus, Loader2 } from 'lucide-react'

interface Order {
  id: string
  customer_id: string
  origin: { address: string; lat: number; lng: number }
  destination: { address: string; lat: number; lng: number }
  status: number
  priority: number
  weight_kg: number
  volume_m3: number
  created_at_unix: number
}

interface OrdersResponse {
  orders: Order[]
  total: number
  page: number
}

const STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: 'Создан', color: 'text-accent-lavender' },
  1: { label: 'В обработке', color: 'text-accent-sky' },
  2: { label: 'Назначен', color: 'text-accent-mint' },
  3: { label: 'Забран', color: 'text-status-warning' },
  4: { label: 'В пути', color: 'text-status-warning' },
  5: { label: 'Доставлен', color: 'text-status-success' },
  6: { label: 'Ошибка', color: 'text-status-error' },
  7: { label: 'Отменен', color: 'text-status-error' },
}

export function OrdersPage() {
  const { data, isLoading, error } = useQuery<OrdersResponse>({
    queryKey: ['orders'],
    queryFn: () => apiFetch('/orders'),
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Заказы</h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-accent-lavender text-background rounded-lg font-medium hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" />
          Создать заказ
        </button>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-accent-lavender animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-status-error/10 border border-status-error rounded-lg text-status-error">
          Ошибка загрузки заказов
        </div>
      )}

      {data && (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-text-secondary font-medium">ID</th>
                <th className="text-left p-4 text-text-secondary font-medium">Откуда</th>
                <th className="text-left p-4 text-text-secondary font-medium">Куда</th>
                <th className="text-left p-4 text-text-secondary font-medium">Статус</th>
                <th className="text-left p-4 text-text-secondary font-medium">Вес</th>
                <th className="text-left p-4 text-text-secondary font-medium">Создан</th>
              </tr>
            </thead>
            <tbody>
              {data.orders.map((order) => (
                <tr key={order.id} className="border-b border-border hover:bg-surface-hover transition-colors">
                  <td className="p-4 text-text-primary font-mono text-sm">{order.id.slice(0, 8)}</td>
                  <td className="p-4 text-text-primary">{order.origin?.address || '—'}</td>
                  <td className="p-4 text-text-primary">{order.destination?.address || '—'}</td>
                  <td className="p-4">
                    <span className={STATUS_MAP[order.status]?.color}>
                      {STATUS_MAP[order.status]?.label || 'Неизвестно'}
                    </span>
                  </td>
                  <td className="p-4 text-text-secondary">{order.weight_kg} кг</td>
                  <td className="p-4 text-text-secondary">
                    {order.created_at_unix ? new Date(order.created_at_unix * 1000).toLocaleDateString('ru') : '—'}
                  </td>
                </tr>
              ))}
              {data.orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Нет заказов</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}