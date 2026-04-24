import { Card } from '@/components/ui'
import { Order } from '@/types'
import { Package } from 'lucide-react'
import { OrderStatusBadge } from './OrderStatusBadge'

function formatDate(ts: unknown): string {
  if (!ts || typeof ts !== 'number') return '—'
  const d = new Date(ts * 1000)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('ru')
}

export function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  return (
    <Card hoverable onClick={onClick}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-lavender/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-accent-lavender" />
          </div>
          <div>
            <p className="font-medium text-text-primary">{order.id.slice(0, 8)}</p>
            <p className="text-sm text-text-secondary">{order.priority > 0 && `Приоритет: ${order.priority}`}</p>
          </div>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>
      <div className="text-sm text-text-secondary">
        <p>{order.origin?.address || '—'} → {order.destination?.address || '—'}</p>
      </div>
      <div className="flex gap-4 mt-2 text-sm text-text-muted">
        <span>{order.weightKg} кг</span>
        <span>{order.volumeM3} м³</span>
        <span>{formatDate(order.createdAtUnix)}</span>
      </div>
    </Card>
  )
}