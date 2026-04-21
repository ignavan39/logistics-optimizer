import { useQuery } from '@tanstack/react-query'
import { apiFetch, VEHICLE_STATUS } from '@/lib/utils'
import { Truck, Loader2 } from 'lucide-react'

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
  const { data, isLoading, error } = useQuery<VehiclesResponse>({
    queryKey: ['vehicles'],
    queryFn: () => apiFetch('/vehicles'),
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
            <div
              key={vehicle.id}
              className="bg-surface rounded-xl border border-border p-4 hover:bg-surface-hover transition-colors"
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
            </div>
          ))}
          {data.vehicles.length === 0 && (
            <div className="col-span-full p-8 text-center text-text-muted">
              <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Нет транспорта</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}