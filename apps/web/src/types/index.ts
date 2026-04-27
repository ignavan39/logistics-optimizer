export interface CompanySettings {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  director?: string
}

export const ORDER_STATUS_LABELS = {
  PENDING: 'Новый',
  FINDING_VEHICLE: 'Поиск ТС',
  CALCULATING_ROUTE: 'Расчёт маршрута',
  ASSIGNED: 'Назначен',
  PICKED_UP: 'Загружен',
  IN_TRANSIT: 'В пути',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
} as const

export const ORDER_STATUS_COLORS = {
  PENDING: 'yellow',
  FINDING_VEHICLE: 'blue',
  CALCULATING_ROUTE: 'blue',
  ASSIGNED: 'blue',
  PICKED_UP: 'indigo',
  IN_TRANSIT: 'indigo',
  DELIVERED: 'green',
  CANCELLED: 'red',
} as const

export const VEHICLE_STATUS_LABELS = {
  AVAILABLE: 'Доступен',
  IN_USE: 'В работе',
  MAINTENANCE: 'На ТО',
  UNAVAILABLE: 'Недоступен',
} as const

export const VEHICLE_STATUS_COLORS = {
  AVAILABLE: 'green',
  IN_USE: 'blue',
  MAINTENANCE: 'yellow',
  UNAVAILABLE: 'red',
} as const

export const COUNTERPARTY_TYPE_LABELS = {
  CLIENT: 'Клиент',
  CARRIER: 'Перевозчик',
  BOTH: 'Клиент+Перевозчик',
} as const

export const COUNTERPARTY_STATUS_LABELS = {
  ACTIVE: 'Активен',
  INACTIVE: 'Неактивен',
} as const

export const CONTRACT_STATUS_LABELS = {
  DRAFT: 'Черновик',
  ACTIVE: 'Активен',
  EXPIRED: 'Истёк',
  CANCELLED: 'Отменён',
} as const

export * from './order'
export * from './vehicle'
export * from './dispatch'
export * from './invoice'
export * from './counterparty'
export * from './tracking'
export * from './audit'
export * from './user'
export * from './route'
export * from './settings'