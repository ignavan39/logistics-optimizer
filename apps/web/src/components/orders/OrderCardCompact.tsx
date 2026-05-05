import { MapPin, Package, Clock, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import { ORDER_STATUS_COLORS, type Order, type OrderStatus, type OrderStatusInfo } from '@/types'

interface OrderCardCompactProps {
  order: Order
  isSelected: boolean
  onClick: () => void
  onStatusChange: (status: OrderStatus) => void
  statuses?: OrderStatusInfo[]
}

export function OrderCardCompact({ order, isSelected, onClick, onStatusChange, statuses = [] }: OrderCardCompactProps) {
  const [showMenu, setShowMenu] = useState(false)

  const statusColor = ORDER_STATUS_COLORS[order.status as OrderStatus] || 'muted'
  const statusInfo = statuses.find(s => s.value === order.status)
  const statusLabel = statusInfo?.label || 'Неизвестно'

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '-'
    return new Date(timestamp * 1000).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div
      onClick={onClick}
      className={`bg-background rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'border-accent-lavender ring-1 ring-accent-lavender'
          : 'border-border hover:border-accent-lavender/50'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-sm text-accent-lavender font-medium">
          #{order.id?.slice(0, 8)}
        </span>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1 hover:bg-surface-hover rounded"
          >
            <MoreHorizontal className="w-4 h-4 text-text-muted" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-6 z-10 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
              {order.status === 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onStatusChange(1)
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-surface-hover"
                >
                  Назначить
                </button>
              )}
              {order.status === 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onStatusChange(2)
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-surface-hover"
                >
                  В путь
                </button>
              )}
              {order.status === 2 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onStatusChange(3)
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-surface-hover"
                >
                  Доставлен
                </button>
              )}
              {order.status !== 4 && order.status !== 3 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onStatusChange(4)
                    setShowMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-status-error hover:bg-status-error/10"
                >
                  Отменить
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div className="mb-2">
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Route */}
      <div className="space-y-1.5 text-sm">
        {order.origin && (
          <div className="flex items-start gap-2">
            <MapPin className="w-3 h-3 text-accent-lavender mt-0.5 flex-shrink-0" />
            <span className="text-text-secondary truncate">
              {order.origin.address || `${order.origin.lat?.toFixed(4)}, ${order.origin.lng?.toFixed(4)}`}
            </span>
          </div>
        )}
        {order.destination && (
          <div className="flex items-start gap-2">
            <MapPin className="w-3 h-3 text-status-success mt-0.5 flex-shrink-0" />
            <span className="text-text-secondary truncate">
              {order.destination.address || `${order.destination.lat?.toFixed(4)}, ${order.destination.lng?.toFixed(4)}`}
            </span>
          </div>
        )}
      </div>

      {/* Cargo & Time */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <Package className="w-3 h-3" />
          <span className="truncate max-w-[80px]">
            {order.cargoName || order.id?.slice(0, 6)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-text-muted">
          <Clock className="w-3 h-3" />
          <span>{formatDate(order.createdAtUnix)}</span>
        </div>
      </div>
    </div>
  )
}