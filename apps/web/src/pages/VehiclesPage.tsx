import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch, VEHICLE_STATUS } from '@/lib/utils'
import { getAuthHeader } from '@/lib/auth'
import { Truck, Loader2, X, MapPin, User, Package } from 'lucide-react'

interface Vehicle {
  id: string
  capacity_kg: number
  capacity_m3: number
  status: string
  type: number
  current_location?: { lat: number; lng: number }
  version: number
}

interface VehiclesResponse {
  vehicles: Vehicle[]
}

export function VehiclesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery<VehiclesResponse>({
    queryKey: ['vehicles'],
    queryFn: () => apiFetch('/vehicles', { headers: getAuthHeader() }),
  })

  const { data: details, isLoading: detailsLoading } = useQuery({
    queryKey: ['vehicle-details', selectedId],
    queryFn: () => apiFetch<{ 
      vehicle: { 
        id: string
        type: number
        status: string
        capacityKg?: number
        capacityM3?: number
        currentLat?: number
        currentLng?: number
        currentDriverId?: string
        currentOrderId?: string
        driver?: {
          id: string
          email: string
          firstName: string
          lastName: string
          phone?: string
        }
        order?: {
          id: string
          status: number
          priority: number
          pickupAddress: string
          deliveryAddress: string
        }
      }
    }>(`/vehicles/${selectedId}/details`, { headers: getAuthHeader() }),
    enabled: !!selectedId,
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Автопарк</h1>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-accent-lavender animate-spin" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-status-error/10 border border-status-error rounded-lg text-status-error">
          Ошибка загрузки транспорта
        </div>
      )}

      {data && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {data.vehicles.map((vehicle) => (
            <button
              key={vehicle.id}
              onClick={() => setSelectedId(vehicle.id)}
              className="bg-surface rounded-xl border border-border p-4 hover:bg-surface-hover transition-colors text-left"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-lavender/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-accent-lavender" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{vehicle.id.slice(0, 8)}</p>
                    <p className="text-sm text-text-secondary">
                      {['', 'Легковой', 'Фургон', 'Грузовик'][vehicle.type] || 'Неизвестно'}
                    </p>
                  </div>
                </div>
                <span className={VEHICLE_STATUS[vehicle.status === 'AVAILABLE' ? 0 : vehicle.status === 'BUSY' ? 1 : 2]?.color}>
                  {VEHICLE_STATUS[vehicle.status === 'AVAILABLE' ? 0 : vehicle.status === 'BUSY' ? 1 : 2]?.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-text-muted">Грузоподъёмность</p>
                  <p className="text-text-primary">{vehicle.capacity_kg} кг</p>
                </div>
                <div>
                  <p className="text-text-muted">Объём</p>
                  <p className="text-text-primary">{vehicle.capacity_m3} м³</p>
                </div>
              </div>
            </button>
          ))}
          {data.vehicles.length === 0 && (
            <div className="col-span-full p-8 text-center text-text-muted">
              <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Нет транспорта</p>
            </div>
          )}
        </div>
      )}

      {selectedId && details?.vehicle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedId(null)}>
          <div className="bg-surface rounded-xl border border-border p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-text-primary">Транспорт {selectedId?.slice(0, 8)}</h2>
              <button onClick={() => setSelectedId(null)} className="p-1 hover:bg-surface-hover rounded">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                <Truck className="w-5 h-5 text-accent-lavender" />
                <div>
                  <p className="text-text-muted text-sm">Тип</p>
                  <p className="text-text-primary">{details?.vehicle?.type ? ['', 'Легковой', 'Фургон', 'Грузовик'][details?.vehicle?.type ?? 0] : 'Неизвестно'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                <Package className="w-5 h-5 text-accent-lavender" />
                <div>
                  <p className="text-text-muted text-sm">Грузоподъёмность</p>
                  <p className="text-text-primary">{details?.vehicle?.capacityKg || 0} кг</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                  <MapPin className="w-5 h-5 text-accent-lavender" />
                  <div>
                    <p className="text-text-muted text-sm">Локация</p>
                    <p className="text-text-primary text-xs">
                      {details?.vehicle?.currentLat ? details.vehicle.currentLat.toFixed(4) : '—'}, {details?.vehicle?.currentLng ? details.vehicle.currentLng.toFixed(4) : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                  <User className="w-5 h-5 text-accent-lavender" />
                  <div>
                    <p className="text-text-muted text-sm">Водитель</p>
                    <p className="text-text-primary text-xs">
                      {details?.vehicle?.driver ? `${details.vehicle.driver.firstName} ${details.vehicle.driver.lastName}` : 'Нет'}
                    </p>
                  </div>
                </div>
              </div>
              {details?.vehicle?.order && (
                <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                  <Package className="w-5 h-5 text-accent-lavender" />
                  <div>
                    <p className="text-text-muted text-sm">Заказ</p>
                    <p className="text-text-primary text-xs">{details.vehicle.order.pickupAddress} → {details.vehicle.order.deliveryAddress}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {detailsLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Loader2 className="w-8 h-8 text-accent-lavender animate-spin" />
        </div>
      )}
    </div>
  )
}