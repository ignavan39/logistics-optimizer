import { Badge } from './Badge'
import type { StatusType } from '@/lib/status'
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_COLORS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  COUNTERPARTY_TYPE_LABELS,
  CONTRACT_STATUS_LABELS,
} from '@/lib/status'

interface StatusBadgeProps {
  status: string | number
  type: StatusType
  className?: string
}

const labelsMap: Record<StatusType, Record<string, string>> = {
  order: ORDER_STATUS_LABELS,
  vehicle: VEHICLE_STATUS_LABELS,
  invoice: INVOICE_STATUS_LABELS,
  counterparty: COUNTERPARTY_TYPE_LABELS,
  contract: CONTRACT_STATUS_LABELS,
}

const colorsMap: Record<StatusType, Record<string, 'muted' | 'lavender' | 'blue' | 'success' | 'warning' | 'error'>> = {
  order: ORDER_STATUS_COLORS,
  vehicle: VEHICLE_STATUS_COLORS,
  invoice: INVOICE_STATUS_COLORS,
  counterparty: { CLIENT: 'lavender', CARRIER: 'warning', BOTH: 'success' },
  contract: { ACTIVE: 'success', EXPIRED: 'muted', TERMINATED: 'error', DRAFT: 'muted' },
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const label = labelsMap[type]?.[String(status)] ?? String(status)
  const color = colorsMap[type]?.[String(status)] ?? 'muted'

  return <Badge label={label} color={color} className={className} />
}
