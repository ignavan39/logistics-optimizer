export interface Vehicle {
  id: string
  type: VehicleType
  status: VehicleStatus
  capacityKg: number
  capacityM3: number
  currentLocation?: { lat: number; lng: number }
  currentDriverId?: string
  currentOrderId?: string
  version: number
}

export type VehicleType = 1 | 2 | 3
export type VehicleStatus = 'AVAILABLE' | 'BUSY' | 'MAINTENANCE'

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = { 1: 'Легковой', 2: 'Фургон', 3: 'Грузовик' }
export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = { AVAILABLE: 'Доступен', BUSY: 'Занят', MAINTENANCE: 'Обслуживание' }
export const VEHICLE_STATUS_COLORS: Record<VehicleStatus, 'success' | 'warning' | 'muted'> = { AVAILABLE: 'success', BUSY: 'warning', MAINTENANCE: 'muted' }