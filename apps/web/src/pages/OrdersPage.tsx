import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { Button, PageLoader, Input } from '@/components/ui'
import { OrderCard } from '@/features/orders'
import { type Order, type OrderStatus, type OrderHistoryItem, ORDER_STATUS_LABELS, type CreateOrderDto, type UpdateOrderStatusDto, type CancelOrderDto } from '@/types'
import { Package, Plus, History, XCircle, RefreshCw } from 'lucide-react'
import { Badge, Modal } from '@/components/ui'

export function OrdersPage() {
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showStatus, setShowStatus] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details')
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery<{ orders: Order[]; total: number }>({
    queryKey: ['orders', page],
    queryFn: () => apiGet<{ orders: Order[]; total: number }>('/orders', { page, limit: 20 }),
    retry: 1,
  })

  const { data: orderHistory } = useQuery<OrderHistoryItem[]>({
    queryKey: ['orders', selectedId, 'history'],
    queryFn: () => apiGet<OrderHistoryItem[]>(`/orders/${selectedId}/history`),
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

  const order = data?.orders.find(o => o.id === selectedId)
  const totalPages = data ? Math.ceil(data.total / 20) : 0

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

  if (isLoading) return <PageLoader />
  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-text-muted">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Сервис недоступен</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Заказы</h1>
        <Button onClick={() => { setShowCreate(true); }}>
          <Plus className="w-4 h-4 mr-2" />Создать заказ
        </Button>
      </div>

      {!data?.orders.length ? (
        <div className="text-center py-12 text-text-muted">
          <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Нет заказов</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.orders.map(orderItem => (
            <OrderCard key={orderItem.id} order={orderItem} onClick={() => { setSelectedId(orderItem.id); setActiveTab('details') }} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-text-muted">Страница {page} из {totalPages}</div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => { setPage(p => p - 1); }}>Назад</Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); }}>Вперёд</Button>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); }} title="Создать заказ" size="lg">
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
            <Button type="button" variant="secondary" onClick={() => { setShowCreate(false); }}>Отмена</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Order Details Modal */}
      <Modal isOpen={!!selectedId && !!order} onClose={() => { setSelectedId(null); }} title={`Заказ ${selectedId?.slice(0, 8)}`} size="lg">
        {order && (
          <div className="space-y-4">
            <div className="flex gap-4 border-b border-border">
              <button
                onClick={() => { setActiveTab('details'); }}
                className={`pb-2 px-1 ${activeTab === 'details' ? 'border-b-2 border-accent-lavender text-primary' : 'text-text-muted'}`}
              >
                Детали
              </button>
              <button
                onClick={() => { setActiveTab('history'); }}
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
                      <Button size="sm" onClick={() => { setShowStatus(true); }}>
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
      <Modal isOpen={showStatus} onClose={() => { setShowStatus(false); }} title="Изменить статус">
        <form onSubmit={handleStatusSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Новый статус</label>
            <select name="status" className="w-full p-2 bg-surface border border-border rounded-lg text-text-primary" required>
              <option value={1}>Назначен</option>
              <option value={2}>В пути</option>
              <option value={3}>Доставлен</option>
              <option value={4}>Отменен</option>
            </select>
          </div>
          <Input name="reason" label="Причина" placeholder="Комментарий (необязательно)" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setShowStatus(false); }}>Отмена</Button>
            <Button type="submit" disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
