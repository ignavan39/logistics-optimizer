import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetchWithAuth as apiFetch } from '@/lib/auth'
import { apiPatch } from '@/lib/api'
import { PageLoader, Badge, Modal, Button, Input } from '@/components/ui'
import { type Vehicle, type VehicleStatus, VEHICLE_TYPE_LABELS, VEHICLE_STATUS_COLORS, VEHICLE_STATUS_LABELS, type Order } from '@/types'
import { Truck, Package, RefreshCw, User, MapPin, Calendar } from 'lucide-react'

export function VehiclesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAssign, setShowAssign] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery<{ vehicles: Vehicle[] }>({
    queryKey: ['vehicles'],
    queryFn: () => apiFetch('/vehicles'),
    retry: 1,
  })

  const { data: pendingOrders, isLoading: pendingLoading } = useQuery<{ orders: Order[]; total: number }>({
    queryKey: ['orders', 'pending'],
    queryFn: () => apiFetch('/orders?status=0&limit=50'),
    enabled: showAssign,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VehicleStatus }) =>
      apiPatch(`/vehicles/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  })

  const assignMutation = useMutation({
    mutationFn: (orderId: string) => 
      apiFetch(`/vehicles/${selectedId}/assign`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ orderId }) 
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setShowAssign(false)
      setSelectedOrderId('')
    },
  })

  const releaseMutation = useMutation({
    mutationFn: () => apiFetch(`/vehicles/${selectedId}/release`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  })

  const vehicle = data?.vehicles.find(v => v.id === selectedId)

  const handleStatusChange = (newStatus: VehicleStatus) => {
    if (!selectedId) return
    updateStatusMutation.mutate({ id: selectedId, status: newStatus })
  }

  const handleAssign = () => {
    if (!selectedOrderId) return
    assignMutation.mutate(selectedOrderId)
  }

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
            <button 
              key={vehicle.id} 
              onClick={() => { setSelectedId(vehicle.id); }} 
              className="bg-surface rounded-xl border border-border p-4 hover:bg-surface-hover text-left"
            >
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

      {/* Vehicle Details Modal */}
      {selectedId && vehicle && (
        <Modal isOpen={!!selectedId} onClose={() => { setSelectedId(null); }} title={`Транспорт ${selectedId.slice(0, 8)}`}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
              <Truck className="w-5 h-5 text-accent-lavender" />
              <div>
                <p className="text-text-muted text-sm">Тип</p>
                <p className="text-text-primary">{VEHICLE_TYPE_LABELS[vehicle.type]}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                <Package className="w-5 h-5 text-accent-lavender" />
                <div>
                  <p className="text-text-muted text-sm">Грузоподъёмность</p>
                  <p className="text-text-primary">{vehicle.capacityKg} кг</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                <Package className="w-5 h-5 text-accent-lavender" />
                <div>
                  <p className="text-text-muted text-sm">Объём</p>
                  <p className="text-text-primary">{vehicle.capacityM3} м³</p>
                </div>
              </div>
            </div>

            {vehicle.currentLocation && (
              <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                <MapPin className="w-5 h-5 text-accent-lavender" />
                <div>
                  <p className="text-text-muted text-sm">Местоположение</p>
                  <p className="text-text-primary">
                    {vehicle.currentLocation.lat.toFixed(4)}, {vehicle.currentLocation.lng.toFixed(4)}
                  </p>
                </div>
              </div>
            )}

            {vehicle.currentOrderId && (
              <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                <Calendar className="w-5 h-5 text-accent-lavender" />
                <div>
                  <p className="text-text-muted text-sm">Текущий заказ</p>
                  <p className="text-text-primary">{vehicle.currentOrderId.slice(0, 8)}</p>
                </div>
              </div>
            )}

            {vehicle.currentDriverId && (
              <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                <User className="w-5 h-5 text-accent-lavender" />
                <div>
                  <p className="text-text-muted text-sm">Вод��тель</p>
                  <p className="text-text-primary">{vehicle.currentDriverId.slice(0, 8)}</p>
                </div>
              </div>
            )}

            {/* Status Change */}
            <div>
              <p className="text-text-muted text-sm mb-2">Статус</p>
              <div className="flex gap-2">
                {vehicle.status !== 'AVAILABLE' && (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => handleStatusChange('AVAILABLE')}
                    disabled={updateStatusMutation.isPending}
                  >
                    Доступен
                  </Button>
                )}
                {vehicle.status !== 'BUSY' && (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => handleStatusChange('BUSY')}
                    disabled={updateStatusMutation.isPending}
                  >
                    Занят
                  </Button>
                )}
                {vehicle.status !== 'MAINTENANCE' && (
                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => handleStatusChange('MAINTENANCE')}
                    disabled={updateStatusMutation.isPending}
                  >
                    На обслуживании
                  </Button>
                )}
              </div>
            </div>

            {/* Assign/Release */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              {vehicle.status === 'AVAILABLE' && (
                <Button size="sm" onClick={() => setShowAssign(true)}>
                  Назначить заказ
                </Button>
              )}
              {vehicle.status === 'BUSY' && (
                <Button size="sm" variant="secondary" onClick={() => releaseMutation.mutate()}>
                  Освободить
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => { setSelectedId(null); }}>Закрыть</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Assign Order Modal */}
      <Modal isOpen={showAssign} onClose={() => { setShowAssign(false); setSelectedOrderId(''); }} title="Назначить заказ">
        <div className="space-y-4">
          <p className="text-text-muted text-sm">Выберите заказ:</p>
          
          {!pendingOrders?.orders.length ? (
            <p className="text-text-muted text-center py-4">Нет доступных заказов</p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {pendingOrders.orders.map(order => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    selectedOrderId === order.id 
                      ? 'border-accent-lavender bg-accent-lavender/10' 
                      : 'border-border hover:bg-surface-hover'
                  }`}
                >
                  <p className="font-medium text-text-primary">{order.id.slice(0, 8)}</p>
                  <p className="text-sm text-text-muted">
                    {order.origin?.address} → {order.destination?.address}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {order.weightKg} кг, {order.volumeM3} м³
                  </p>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="secondary" onClick={() => { setShowAssign(false); setSelectedOrderId(''); }}>
              Отмена
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={!selectedOrderId || assignMutation.isPending}
            >
              {assignMutation.isPending ? 'Назначение...' : 'Назначить'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}