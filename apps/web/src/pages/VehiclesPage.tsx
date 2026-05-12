import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Truck, Plus } from 'lucide-react'
import { PageLoader, Button } from '@/components/ui'
import { apiFetchWithAuth as apiFetch } from '@/lib/auth'
import { VehicleCard } from '@/components/vehicles/VehicleCard'
import { VehicleDetailsModal } from '@/components/vehicles/VehicleDetailsModal'
import { CreateVehicleModal } from '@/components/vehicles/CreateVehicleModal'
import type { Vehicle } from '@/types'

export function VehiclesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading, error } = useQuery<{ vehicles: Vehicle[] }>({
    queryKey: ['vehicles'],
    queryFn: () => apiFetch('/vehicles'),
    retry: 1,
  })

  const vehicle = data?.vehicles?.find(v => v.id === selectedId) ?? null

  if (isLoading) return <PageLoader />
  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-text-muted">
          <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Сервис недоступен</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Автопарк</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить машину
        </Button>
      </div>

      {!data?.vehicles?.length ? (
        <div className="text-center py-12 text-text-muted">
          <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Нет транспорта</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.vehicles?.map(vehicle => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onClick={() => setSelectedId(vehicle.id)}
            />
          ))}
        </div>
      )}

      <VehicleDetailsModal
        vehicle={vehicle}
        isOpen={!!selectedId}
        onClose={() => setSelectedId(null)}
      />

      <CreateVehicleModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  )
}
