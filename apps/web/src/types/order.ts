export interface OrderLocation {
  address: string
  lat: number
  lng: number
}

export interface Order {
  id: string
  customerId: string
  origin: OrderLocation
  destination: OrderLocation
  status: OrderStatus
  priority: number
  weightKg: number
  volumeM3: number
  createdAtUnix: number
  version?: number
  vehicleId?: string
  driverId?: string
}

export type OrderStatus = 0 | 1 | 2 | 3 | 4

export interface OrderDetails extends Order {
  history?: OrderHistoryItem[]
}

export interface OrderHistoryItem {
  id: string
  status: OrderStatus
  changedAtUnix: number
  changedBy?: string
  comment?: string
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  0: 'Создан',
  1: 'Назначен',
  2: 'В пути',
  3: 'Доставлен',
  4: 'Отменен',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, 'lavender' | 'sky' | 'mint' | 'success' | 'warning' | 'error'> = {
  0: 'lavender',
  1: 'sky',
  2: 'warning',
  3: 'success',
  4: 'error',
}