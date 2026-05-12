import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Truck, Package, User, MapPin, Calendar } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { apiFetchWithAuth as apiFetch } from '@/lib/auth'
import { apiPatch } from '@/lib/api'
import { VEHICLE_TYPE_LABELS } from '@/types/vehicle'
import type { Vehicle, VehicleStatus, Order } from '@/types'

interface VehicleDetailsModalProps {
  vehicle: Vehicle | null
  isOpen: boolean
  onClose: () => void
}

export function VehicleDetailsModal({ vehicle, isOpen, onClose }: VehicleDetailsModalProps) {
  const queryClient = useQueryClient()
  const [showAssign, setShowAssign] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState('')

  const { data: pendingOrders } = useQuery<{ orders: Order[] }>({
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
      apiFetch(`/vehicles/${vehicle?.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      setShowAssign(false)
      setSelectedOrderId('')
    },
  })

  const releaseMutation = useMutation({
    mutationFn: () => apiFetch(`/vehicles/${vehicle?.id}/release`, { method: 'POST' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  })

  if (!vehicle) return null

  const handleStatusChange = (newStatus: VehicleStatus) => {
    updateStatusMutation.mutate({ id: vehicle.id, status: newStatus })
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Транспорт ${vehicle.id.slice(0, 8)}`}
      >
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
                <p className="text-text-muted text-sm">Водитель</p>
                <p className="text-text-primary">{vehicle.currentDriverId.slice(0, 8)}</p>
              </div>
            </div>
          )}

          <div>
            <p className="text-text-muted text-sm mb-2">Статус</p>
            <div className="flex gap-2">
              {vehicle.status !== 'AVAILABLE' && (
                <Button size="sm" variant="secondary" onClick={() => handleStatusChange('AVAILABLE')}>
                  Доступен
                </Button>
              )}
              {vehicle.status !== 'BUSY' && (
                <Button size="sm" variant="secondary" onClick={() => handleStatusChange('BUSY')}>
                  Занят
                </Button>
              )}
              {vehicle.status !== 'MAINTENANCE' && (
                <Button size="sm" variant="secondary" onClick={() => handleStatusChange('MAINTENANCE')}>
                  На обслуживании
                </Button>
              )}
            </div>
          </div>

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
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showAssign}
        onClose={() => { setShowAssign(false); setSelectedOrderId(''); }}
        title="Назначить заказ"
      >
        <div className="space-y-4">
          <p className="text-text-muted text-sm">Выберите заказ:</p>

          {!pendingOrders?.orders?.length ? (
            <p className="text-text-muted text-center py-4">Нет доступных заказов</p>
          ) : (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {pendingOrders?.orders?.map(order => (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`w-full p-3 rounded-lg border text-left ${
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
              onClick={() => selectedOrderId && assignMutation.mutate(selectedOrderId)}
              disabled={!selectedOrderId || assignMutation.isPending}
            >
              {assignMutation.isPending ? 'Назначение...' : 'Назначить'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
