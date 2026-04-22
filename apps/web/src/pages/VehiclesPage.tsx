import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetchWithAuth as apiFetch } from '@/lib/auth'
import { VEHICLE_STATUS } from '@/lib/utils'
import { Truck, Loader2, X, MapPin, User, Package, Pencil, Save } from 'lucide-react'

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
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState<{ type?: string; capacityKg?: number; capacityM3?: number; currentLat?: number; currentLng?: number } | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery<VehiclesResponse>({
    queryKey: ['vehicles'],
    queryFn: () => apiFetch('/vehicles'),
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
        version?: number
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
    }>(`/vehicles/${selectedId}/details`),
    enabled: !!selectedId,
  })

  const updateMutation = useMutation({
    mutationFn: (data: { type?: string; capacity_kg?: number; capacity_m3?: number; current_lat?: number; current_lng?: number; expected_version?: number }) =>
      apiFetch(`/vehicles/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      queryClient.invalidateQueries({ queryKey: ['vehicle-details', selectedId!] })
      setIsEditing(false)
      setEditData(null)
    },
  })

  const handleEdit = () => {
    if (details?.vehicle) {
      setEditData({
        type: details.vehicle.type ? ['CAR', 'VAN', 'TRUCK'][details.vehicle.type - 1] : 'VAN',
        capacityKg: details.vehicle.capacityKg,
        capacityM3: details.vehicle.capacityM3,
        currentLat: details.vehicle.currentLat,
        currentLng: details.vehicle.currentLng,
      })
      setIsEditing(true)
    }
  }

  const handleSave = () => {
    if (!editData || !selectedId || !details?.vehicle) return
    updateMutation.mutate({
      type: editData.type,
      capacity_kg: editData.capacityKg,
      capacity_m3: editData.capacityM3,
      current_lat: editData.currentLat,
      current_lng: editData.currentLng,
      expected_version: details.vehicle.version,
    })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditData(null)
  }

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => { setSelectedId(null); setIsEditing(false); }}>
          <div className="bg-surface rounded-xl border border-border p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-text-primary">Транспорт {selectedId?.slice(0, 8)}</h2>
              <button onClick={() => { setSelectedId(null); setIsEditing(false); }} className="p-1 hover:bg-surface-hover rounded">
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                <Truck className="w-5 h-5 text-accent-lavender" />
                <div className="flex-1">
                  <p className="text-text-muted text-sm">Тип</p>
                  {isEditing ? (
                    <select
                      value={editData?.type || 'VAN'}
                      onChange={(e) => setEditData({ ...editData!, type: e.target.value as 'CAR' | 'VAN' | 'TRUCK' })}
                      className="w-full mt-1 px-2 py-1 bg-background border border-border rounded text-text-primary"
                    >
                      <option value="CAR">Легковой</option>
                      <option value="VAN">Фургон</option>
                      <option value="TRUCK">Грузовик</option>
                    </select>
                  ) : (
                    <p className="text-text-primary">{details?.vehicle?.type ? ['', 'Легковой', 'Фургон', 'Грузовик'][details?.vehicle?.type ?? 0] : 'Неизвестно'}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                <Package className="w-5 h-5 text-accent-lavender" />
                <div className="flex-1">
                  <p className="text-text-muted text-sm">Грузоподъёмность (кг)</p>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData?.capacityKg ?? ''}
                      onChange={(e) => setEditData({ ...editData!, capacityKg: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                      className="w-full mt-1 px-2 py-1 bg-background border border-border rounded text-text-primary"
                      placeholder={String(details?.vehicle?.capacityKg || '')}
                    />
                  ) : (
                    <p className="text-text-primary">{details?.vehicle?.capacityKg || 0} кг</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                <Package className="w-5 h-5 text-accent-lavender" />
                <div className="flex-1">
                  <p className="text-text-muted text-sm">Объём (м³)</p>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.1"
                      value={editData?.capacityM3 ?? ''}
                      onChange={(e) => setEditData({ ...editData!, capacityM3: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                      className="w-full mt-1 px-2 py-1 bg-background border border-border rounded text-text-primary"
                      placeholder={String(details?.vehicle?.capacityM3 || '')}
                    />
                  ) : (
                    <p className="text-text-primary">{details?.vehicle?.capacityM3 || 0} м³</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                  <MapPin className="w-5 h-5 text-accent-lavender" />
                  <div className="flex-1">
                    <p className="text-text-muted text-sm">Широта</p>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.0001"
                        value={editData?.currentLat ?? ''}
                        onChange={(e) => setEditData({ ...editData!, currentLat: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                        className="w-full mt-1 px-2 py-1 bg-background border border-border rounded text-text-primary"
                        placeholder={String(details?.vehicle?.currentLat || '')}
                      />
                    ) : (
                      <p className="text-text-primary text-xs">
                        {details?.vehicle?.currentLat ? details.vehicle.currentLat.toFixed(4) : '—'}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                  <MapPin className="w-5 h-5 text-accent-lavender" />
                  <div className="flex-1">
                    <p className="text-text-muted text-sm">Долгота</p>
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.0001"
                        value={editData?.currentLng ?? ''}
                        onChange={(e) => setEditData({ ...editData!, currentLng: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                        className="w-full mt-1 px-2 py-1 bg-background border border-border rounded text-text-primary"
                        placeholder={String(details?.vehicle?.currentLng || '')}
                      />
                    ) : (
                      <p className="text-text-primary text-xs">
                        {details?.vehicle?.currentLng ? details.vehicle.currentLng.toFixed(4) : '—'}
                      </p>
                    )}
                  </div>
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
            <div className="flex gap-2 mt-4">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="flex-1 px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-surface-hover"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent-lavender text-background rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEdit}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent-lavender text-background rounded-lg font-medium hover:opacity-90"
                >
                  <Pencil className="w-4 h-4" />
                  Редактировать
                </button>
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