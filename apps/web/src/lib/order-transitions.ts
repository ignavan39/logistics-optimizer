import type { OrderStatus } from '@/types'

export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:    ['assigned', 'cancelled', 'failed'],
  assigned:   ['picked_up', 'cancelled', 'failed'],
  picked_up:  ['in_transit', 'failed'],
  in_transit: ['delivered', 'failed'],
  delivered:  [],
  failed:     ['pending'],
  cancelled:  [],
}

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}