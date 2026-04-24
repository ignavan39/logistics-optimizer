import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetchWithAuth as apiFetch } from '@/lib/auth'
import { PageLoader, Badge, Modal, Button } from '@/components/ui'
import { Vehicle, VEHICLE_TYPE_LABELS, VEHICLE_STATUS_LABELS, VEHICLE_STATUS_COLORS } from '@/types'
import { Truck, Package } from 'lucide-react'

export function VehiclesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery<{ vehicles: Vehicle[] }>({
    queryKey: ['vehicles'],
    queryFn: () => apiFetch('/vehicles'),
    retry: 1,
  })

  const assignMutation = useMutation({
    mutationFn: (orderId: string) => apiFetch(`/vehicles/${selectedId}/assign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  })

  const releaseMutation = useMutation({
    mutationFn: () => apiFetch(`/vehicles/${selectedId}/release`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  })

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
      </div>

      {!data?.vehicles.length ? (
        <div className="text-center py-12 text-text-muted">
          <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Нет транспорта</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.vehicles.map(vehicle => (
            <button key={vehicle.id} onClick={() => setSelectedId(vehicle.id)} className="bg-surface rounded-xl border border-border p-4 hover:bg-surface-hover text-left">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-lavender/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-accent-lavender" />
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{vehicle.id.slice(0, 8)}</p>
                    <p className="text-sm text-text-secondary">{VEHICLE_TYPE_LABELS[vehicle.type]}</p>
                  </div>
                </div>
                <Badge label={VEHICLE_STATUS_LABELS[vehicle.status]} color={VEHICLE_STATUS_COLORS[vehicle.status]} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-text-muted">Грузоподъёмность</p><p className="text-text-primary">{vehicle.capacityKg} кг</p></div>
                <div><p className="text-text-muted">Объём</p><p className="text-text-primary">{vehicle.capacityM3} м³</p></div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedId && (
        <Modal isOpen={!!selectedId} onClose={() => setSelectedId(null)} title={`Транспорт ${selectedId.slice(0, 8)}`}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
              <Truck className="w-5 h-5 text-accent-lavender" />
              <div><p className="text-text-muted text-sm">Тип</p><p className="text-text-primary">{VEHICLE_TYPE_LABELS[data?.vehicles.find(v => v.id === selectedId)?.type || 1]}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                <Package className="w-5 h-5 text-accent-lavender" />
                <div><p className="text-text-muted text-sm">Грузоподъёмность</p><p className="text-text-primary">{data?.vehicles.find(v => v.id === selectedId)?.capacityKg} кг</p></div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                <Package className="w-5 h-5 text-accent-lavender" />
                <div><p className="text-text-muted text-sm">Объём</p><p className="text-text-primary">{data?.vehicles.find(v => v.id === selectedId)?.capacityM3} м³</p></div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {data?.vehicles.find(v => v.id === selectedId)?.status === 'AVAILABLE' && (
                <Button size="sm" onClick={() => { const id = prompt('Введите ID заказа'); if (id) assignMutation.mutate(id); }}>
                  Назначить
                </Button>
              )}
              {data?.vehicles.find(v => v.id === selectedId)?.status === 'BUSY' && (
                <Button size="sm" onClick={() => releaseMutation.mutate()}>Освободить</Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setSelectedId(null)}>Закрыть</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}