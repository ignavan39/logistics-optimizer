import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'
import { Truck, Package, FileText, TrendingUp, Plus, RefreshCw, XCircle, History } from 'lucide-react'
import { apiFetchWithAuth as apiFetch } from '@/lib/auth'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { PageLoader, Badge, Button, Input, Modal } from '@/components/ui'
import { OrderCard } from '@/features/orders'
import { Order, type OrderStatus, type OrderHistoryItem, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, VEHICLE_STATUS_COLORS, type CreateOrderDto, type UpdateOrderStatusDto, type CancelOrderDto } from '@/types'
import L from 'leaflet'

const defaultCenter: [number, number] = [55.7558, 37.6173]

const truckIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background: #a8d8ea; width: 20px; height: 20px; border-radius: 50%; border: 2px solid #fff;"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

export function DashboardPage() {
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showStatus, setShowStatus] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details')
  const queryClient = useQueryClient()

  // All orders for stats & map
  const { data: allOrdersData, isLoading: allOrdersLoading } = useQuery<{ orders: { id: string; status: number; origin?: { lat: number; lng: number }; destination?: { lat: number; lng: number } }[] }>({
    queryKey: ['orders', 'all'],
    queryFn: () => apiFetch('/orders?limit=100'),
  })

  // Paginated orders list
  const { data: ordersListData, isLoading: listLoading, error: listError } = useQuery<{ orders: Order[]; total: number }>({
    queryKey: ['orders', 'list', page],
    queryFn: () => apiGet<{ orders: Order[]; total: number }>('/orders', { page, limit: 20 }),
    retry: 1,
  })

  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery<{ vehicles: { id: string; status: string; current_location?: { lat: number; lng: number } }[] }>({
    queryKey: ['vehicles'],
    queryFn: () => apiFetch('/vehicles'),
  })

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<{ items: { status: number; amount: number }[] }>({
    queryKey: ['invoices', 'all'],
    queryFn: () => apiFetch('/invoices?limit=100'),
  })

  const { data: orderHistory } = useQuery<OrderHistoryItem[]>({
    queryKey: ['orders', selectedId, 'history'],
    queryFn: () => apiFetch<OrderHistoryItem[]>(`/orders/${selectedId}/history`),
    enabled: !!selectedId && activeTab === 'history',
  })

  const createMutation = useMutation({
    mutationFn: (dto: CreateOrderDto) => apiPost<Order>('/orders', dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setShowCreate(false)
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateOrderStatusDto }) =>
      apiPatch<Order>(`/orders/${id}/status`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', selectedId, 'history'] })
      setShowStatus(false)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CancelOrderDto }) =>
      apiDelete<Order>(`/orders/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setSelectedId(null)
    },
  })

  const allOrders = allOrdersData?.orders || []
  const vehicles = vehiclesData?.vehicles || []
  const invoices = invoicesData?.items || []

  const orderStats = {
    total: allOrders.length,
    created: allOrders.filter(o => o.status === 0).length,
    assigned: allOrders.filter(o => o.status === 1).length,
    inTransit: allOrders.filter(o => o.status === 2).length,
    delivered: allOrders.filter(o => o.status === 3).length,
    cancelled: allOrders.filter(o => o.status === 4).length,
  }

  const vehicleStats = {
    total: vehicles.length,
    available: vehicles.filter(v => v.status === 'AVAILABLE').length,
    busy: vehicles.filter(v => v.status === 'BUSY').length,
    maintenance: vehicles.filter(v => v.status === 'MAINTENANCE').length,
  }

  const invoiceStats = {
    total: invoices.length,
    paid: invoices.filter(i => i.status === 2).length,
    pending: invoices.filter(i => i.status === 0 || i.status === 1).length,
    amount: invoices.filter(i => i.status === 2).reduce((sum, i) => sum + i.amount, 0),
  }

  const activeOrders = allOrders.filter(o => o.status === 1 || o.status === 2)
  const vehiclesWithLocation = vehicles.filter(v => v.current_location?.lat && v.current_location?.lng)

  const totalPages = ordersListData ? Math.ceil(ordersListData.total / 20) : 0
  const order = ordersListData?.orders?.find(o => o.id === selectedId)

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const dto: CreateOrderDto = {
      origin: {
        address: formData.get('originAddress') as string,
        lat: Number(formData.get('originLat')),
        lng: Number(formData.get('originLng')),
      },
      destination: {
        address: formData.get('destinationAddress') as string,
        lat: Number(formData.get('destinationLat')),
        lng: Number(formData.get('destinationLng')),
      },
      priority: (formData.get('priority') as 'normal' | 'urgent') || 'normal',
      cargo: {
        name: formData.get('cargoName') as string,
        quantity: Number(formData.get('cargoQuantity')) || 1,
        weightKg: Number(formData.get('weightKg')) || 0,
        volumeM3: Number(formData.get('volumeM3')) || 0,
        valueRub: Number(formData.get('valueRub')) || 0,
      },
    }
    createMutation.mutate(dto)
  }

  const handleStatusSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedId) return
    const formData = new FormData(e.currentTarget)
    updateStatusMutation.mutate({
      id: selectedId,
      dto: {
        status: Number(formData.get('status')) as OrderStatus,
        reason: formData.get('reason') as string | undefined,
      },
    })
  }

  const handleCancel = () => {
    if (!selectedId) return
    const reason = prompt('Причина отмены (необязательно):')
    cancelMutation.mutate({
      id: selectedId,
      dto: reason ? { reason } : {},
    })
  }

  const isLoading = allOrdersLoading || vehiclesLoading || invoicesLoading || listLoading

  if (isLoading) return <PageLoader />

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Главная</h1>
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-lavender/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-accent-lavender" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Заказы</p>
              <p className="text-2xl font-semibold text-text-primary">{orderStats.total}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <Badge label={`${orderStats.assigned + orderStats.inTransit} активных`} color="sky" />
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-status-success/10 flex items-center justify-center">
              <Truck className="w-5 h-5 text-status-success" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Транспорт</p>
              <p className="text-2xl font-semibold text-text-primary">{vehicleStats.total}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <Badge label={`${vehicleStats.available} доступно`} color="success" />
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-sky/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent-sky" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Счета</p>
              <p className="text-2xl font-semibold text-text-primary">{invoiceStats.total}</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2 text-xs">
            <Badge label={`${invoiceStats.paid} оплачено`} color="success" />
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-status-warning/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-status-warning" />
            </div>
            <div>
              <p className="text-sm text-text-muted">Выручка</p>
              <p className="text-2xl font-semibold text-text-primary">
                {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(invoiceStats.amount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders by Status & Vehicle by Status */}
      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="font-medium text-text-primary mb-4">Заказы по статусу</h3>
          <div className="space-y-2">
            {[
              { label: 'Созданы', count: orderStats.created, status: 0 },
              { label: 'Назначены', count: orderStats.assigned, status: 1 },
              { label: 'В пути', count: orderStats.inTransit, status: 2 },
              { label: 'Доставлены', count: orderStats.delivered, status: 3 },
              { label: 'Отменены', count: orderStats.cancelled, status: 4 },
            ].map(item => (
              <div key={item.status} className="flex items-center justify-between">
                <Badge label={item.label} color={ORDER_STATUS_COLORS[item.status as 0 | 1 | 2 | 3 | 4]} />
                <span className="text-text-primary font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="font-medium text-text-primary mb-4">Транспорт по статусу</h3>
          <div className="space-y-2">
            {[
              { label: 'Доступен', count: vehicleStats.available, status: 'AVAILABLE' as const },
              { label: 'Занят', count: vehicleStats.busy, status: 'BUSY' as const },
              { label: 'На обслуживании', count: vehicleStats.maintenance, status: 'MAINTENANCE' as const },
            ].map(item => (
              <div key={item.status} className="flex items-center justify-between">
                <Badge label={item.label} color={VEHICLE_STATUS_COLORS[item.status]} />
                <span className="text-text-primary font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="bg-surface rounded-xl border border-border overflow-hidden mb-6">
        <div className="p-4 border-b border-border">
          <h3 className="font-medium text-text-primary">Карта активности</h3>
        </div>
        <div className="h-80 relative" style={{ zIndex: 0 }}>
          <MapContainer
            center={defaultCenter}
            zoom={10}
            className="h-full w-full"
            style={{ background: '#1a1a2e', zIndex: 0 }}
            preferCanvas
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {activeOrders.slice(0, 10).map(order => {
              if (!order.origin?.lat || !order.destination?.lat) return null
              return (
                <Polyline
                  key={order.id}
                  positions={[
                    [order.origin.lat, order.origin.lng],
                    [order.destination.lat, order.destination.lng],
                  ]}
                  color={order.status === 2 ? '#f59e0b' : '#a8d8ea'}
                  weight={2}
                  opacity={0.6}
                />
              )
            })}

            {vehiclesWithLocation.slice(0, 20).map(vehicle => (
              <Marker
                key={vehicle.id}
                position={[vehicle.current_location!.lat, vehicle.current_location!.lng]}
                icon={truckIcon}
              />
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Orders List */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text-primary">Заказы</h2>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />Создать заказ
          </Button>
        </div>

        {!ordersListData?.orders?.length ? (
          <div className="text-center py-12 text-text-muted">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Нет заказов</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ordersListData?.orders?.map(orderItem => (
              <OrderCard key={orderItem.id} order={orderItem} onClick={() => { setSelectedId(orderItem.id); setActiveTab('details') }} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-text-muted">Страница {page} из {totalPages}</div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Назад</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Вперёд</Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Создать заказ" size="lg">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-text-primary mb-2">Пункт отправления</h3>
            </div>
            <Input name="originAddress" label="Адрес" placeholder="Москва, ул. Тверская 1" required />
            <div className="grid grid-cols-2 gap-2">
              <Input name="originLat" label="Широта" type="number" step="any" placeholder="55.7558" required />
              <Input name="originLng" label="Долгота" type="number" step="any" placeholder="37.6173" required />
            </div>
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-text-primary mb-2">Пункт назначения</h3>
            </div>
            <Input name="destinationAddress" label="Адрес" placeholder="Санкт-Петербург, Невский пр. 10" required />
            <div className="grid grid-cols-2 gap-2">
              <Input name="destinationLat" label="Широта" type="number" step="any" placeholder="59.9311" required />
              <Input name="destinationLng" label="Долгота" type="number" step="any" placeholder="30.3609" required />
            </div>
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-text-primary mb-2">Груз</h3>
            </div>
            <Input name="cargoName" label="Наименование" placeholder="Электроника" required />
            <Input name="cargoQuantity" label="Количество" type="number" placeholder="10" required />
            <Input name="weightKg" label="Вес (кг)" type="number" placeholder="500" required />
            <Input name="volumeM3" label="Объём (м³)" type="number" step="0.1" placeholder="2.5" required />
            <Input name="valueRub" label="Стоимость (₽)" type="number" placeholder="100000" required />
            <div>
              <label className="block text-sm text-text-muted mb-1">Приоритет</label>
              <select name="priority" className="w-full p-2 bg-surface border border-border rounded-lg text-text-primary">
                <option value="normal">Обычный</option>
                <option value="urgent">Срочный</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Отмена</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Order Details Modal */}
      <Modal isOpen={!!selectedId && !!order} onClose={() => setSelectedId(null)} title={`Заказ ${order?.id.slice(0, 8)}`} size="lg">
        {order && (
          <div className="space-y-4">
            <div className="flex gap-4 border-b border-border">
              <button
                onClick={() => setActiveTab('details')}
                className={`pb-2 px-1 ${activeTab === 'details' ? 'border-b-2 border-accent-lavender text-primary' : 'text-text-muted'}`}
              >
                Детали
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`pb-2 px-1 ${activeTab === 'history' ? 'border-b-2 border-accent-lavender text-primary' : 'text-text-muted'}`}
              >
                История
              </button>
            </div>

            {activeTab === 'details' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge label={ORDER_STATUS_LABELS[order.status]} />
                  <span className="text-sm text-text-muted">{order.priority === 1 ? 'Срочный' : 'Обычный'}</span>
                </div>
                <div>
                  <div className="text-sm text-text-muted">Откуда</div>
                  <div className="text-text-primary">{order.origin.address}</div>
                  <div className="text-xs text-text-muted">{order.origin.lat}, {order.origin.lng}</div>
                </div>
                <div>
                  <div className="text-sm text-text-muted">Куда</div>
                  <div className="text-text-primary">{order.destination.address}</div>
                  <div className="text-xs text-text-muted">{order.destination.lat}, {order.destination.lng}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-sm text-text-muted">Вес</div>
                    <div className="text-text-primary">{order.weightKg} кг</div>
                  </div>
                  <div>
                    <div className="text-sm text-text-muted">Объём</div>
                    <div className="text-text-primary">{order.volumeM3} м³</div>
                  </div>
                </div>
                {order.vehicleId && (
                  <div>
                    <div className="text-sm text-text-muted">Транспорт</div>
                    <div className="text-text-primary">{order.vehicleId.slice(0, 8)}</div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  {order.status !== 3 && order.status !== 4 && (
                    <>
                      <Button size="sm" onClick={() => setShowStatus(true)}>
                        <RefreshCw className="w-4 h-4 mr-1" />Изменить статус
                      </Button>
                      <Button size="sm" variant="secondary" onClick={handleCancel}>
                        <XCircle className="w-4 h-4 mr-1" />Отменить
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {orderHistory?.length === 0 && <p className="text-text-muted text-center py-4">Нет истории</p>}
                {orderHistory?.map(item => (
                  <div key={item.id} className="p-3 bg-surface-hover rounded-lg">
                    <div className="flex items-center justify-between">
                      <Badge label={ORDER_STATUS_LABELS[item.status]} />
                      <span className="text-sm text-text-muted">
                        {new Date(item.changedAtUnix * 1000).toLocaleString('ru-RU')}
                      </span>
                    </div>
                    {item.comment && <p className="text-sm text-text-secondary mt-1">{item.comment}</p>}
                    {item.changedBy && <p className="text-xs text-text-muted mt-1">{item.changedBy}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Update Status Modal */}
      <Modal isOpen={showStatus} onClose={() => setShowStatus(false)} title="Изменить статус">
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Новый статус</label>
            <select name="status" className="w-full p-2 bg-surface border border-border rounded-lg text-text-primary" required>
              <option value={1}>Назначен</option>
              <option value={2}>В пути</option>
              <option value={3}>Доставлен</option>
              <option value={4}>Отменён</option>
            </select>
          </div>
          <Input name="reason" label="Причина" placeholder="Комментарий (необязательно)" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowStatus(false)}>Отмена</Button>
            <Button type="submit" disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
