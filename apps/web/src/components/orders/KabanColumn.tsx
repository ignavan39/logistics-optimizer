import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { OrderCardCompact } from './OrderCardCompact'
import { type Order, type OrderStatus, type OrderStatusInfo } from '@/types'

interface KabanColumnProps {
  status: OrderStatus
  orders: Order[]
  selectedId: string | null
  onOrderClick: (id: string) => void
  onStatusChange: (orderId: string, status: OrderStatus) => void
  statuses?: OrderStatusInfo[]
  isDropDisabled?: boolean
}

const COLORS: Record<OrderStatus, string> = {
  pending: '#a8d8ea',
  assigned: '#f59e0b',
  picked_up: '#8b5cf6',
  in_transit: '#22c55e',
  delivered: '#6b7280',
  failed: '#ef4444',
  cancelled: '#6b7280',
}

export function KabanColumn({
  status,
  orders,
  selectedId,
  onOrderClick,
  onStatusChange,
  statuses = [],
  isDropDisabled = false,
}: KabanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    disabled: isDropDisabled,
  })

  const color = COLORS[status] || '#6b7280'
  const statusInfo = statuses.find(s => s.value === status)
  const label = statusInfo?.label || 'Неизвестно'

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[250px] bg-surface rounded-xl border flex flex-col transition-opacity ${
        isOver && !isDropDisabled ? 'border-accent-lavender' : 'border-border'
      } ${isDropDisabled ? 'opacity-40' : ''}`}
    >
      {/* Column header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="font-medium text-text-primary">{label}</span>
        </div>
        <span className="text-sm text-text-muted bg-background px-2 py-0.5 rounded">
          {orders.length}
        </span>
      </div>

      {/* Orders list */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
        <SortableContext
          items={orders.map(o => o.id!)}
          strategy={verticalListSortingStrategy}
        >
{orders.map((order) => (
              <OrderCardCompact
                key={order.id}
                order={order}
                isSelected={selectedId === order.id}
                onClick={() => onOrderClick(order.id!)}
                onStatusChange={(newStatus) => onStatusChange(order.id!, newStatus)}
                statuses={statuses}
              />
            ))}
        </SortableContext>

        {orders.length === 0 && (
          <div className="text-center py-8 text-text-muted text-sm">
            Нет заказов
          </div>
        )}
      </div>
    </div>
  )
}