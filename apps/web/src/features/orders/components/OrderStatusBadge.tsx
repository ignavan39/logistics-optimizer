import { Badge } from '@/components/ui'
import { OrderStatus, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/types'

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge label={ORDER_STATUS_LABELS[status]} color={ORDER_STATUS_COLORS[status]} />
}