import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Truck, Package, FileText, TrendingUp, RefreshCw } from 'lucide-react'
import { apiFetchWithAuth as apiFetch } from '@/lib/auth'
import { apiGet, apiPatch, apiDelete } from '@/lib/api'
import { PageLoader } from '@/components/ui'
import { FilterBar } from '@/components/orders/FilterBar'
import { KabanBoard } from '@/components/orders/KabanBoard'
import { CreateOrderModal } from '@/components/orders/CreateOrderModal'
import { Order, ORDER_STATUS_COLORS, type OrderStatus, type UpdateOrderStatusDto, type CancelOrderDto, type OrderStatusInfo } from '@/types'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function DashboardPage() {
  const queryClient = useQueryClient()
  
  // Filter state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<number[]>([])
  const [dateFilter, setDateFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // Fetch statuses
  const { data: statusesData } = useQuery<{ statuses: OrderStatusInfo[] }>({
    queryKey: ['orders', 'statuses'],
    queryFn: () => apiGet<{ statuses: OrderStatusInfo[] }>('/orders/statuses').catch(() => ({ statuses: [] })),
    staleTime: Infinity,
  })

  const defaultStatuses = [
    { value: 1, key: 'pending', label: 'Создан' },
    { value: 2, key: 'assigned', label: 'Назначен' },
    { value: 3, key: 'picked_up', label: 'Загружен' },
    { value: 4, key: 'in_transit', label: 'В пути' },
    { value: 5, key: 'delivered', label: 'Доставлен' },
    { value: 6, key: 'failed', label: 'Проблема' },
    { value: 7, key: 'cancelled', label: 'Отменен' },
  ]

  const statuses = (statusesData?.statuses?.length ? statusesData.statuses : defaultStatuses) as OrderStatusInfo[]
  const statusLabels: Record<number, string> = Object.fromEntries(
    statuses.map(s => [s.value, s.label])
  )

  // Fetch orders
  const { data: ordersData, isLoading, refetch } = useQuery<{ orders: Order[] }>({
    queryKey: ['orders', 'all'],
    queryFn: () => apiFetch('/orders?limit=500'),
    refetchInterval: 30000,
  })

  // Fetch vehicles
  const { data: vehiclesData } = useQuery<{ vehicles: { id: string; status: string }[] }>({
    queryKey: ['vehicles'],
    queryFn: () => apiFetch('/vehicles'),
  })

  // Fetch invoices for stats
  const { data: invoicesData } = useQuery<{ items: { status: number; amount: number }[] }>({
    queryKey: ['invoices', 'stats'],
    queryFn: () => apiFetch('/invoices?limit=100'),
  })

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateOrderStatusDto }) =>
      apiPatch<Order>(`/orders/${id}/status`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })

  // Cancel order mutation
  const cancelMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CancelOrderDto }) =>
      apiDelete<Order>(`/orders/${id}`, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setSelectedId(null)
    },
  })

  const orders = ordersData?.orders || []
  const vehicles = vehiclesData?.vehicles || []
  const invoices = invoicesData?.items || []

  // Apply filters
  const filteredOrders = orders.filter((order) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      const matchesSearch =
        order.id?.toLowerCase().includes(searchLower) ||
        order.origin?.address?.toLowerCase().includes(searchLower) ||
        order.destination?.address?.toLowerCase().includes(searchLower) ||
        order.cargoName?.toLowerCase().includes(searchLower)
      if (!matchesSearch) return false
    }

    // Status filter
    if (statusFilter.length > 0 && !statusFilter.includes(order.status)) {
      return false
    }

    // Date filter
    if (dateFilter !== 'all' && order.createdAtUnix) {
      const now = Date.now() / 1000
      const orderDate = order.createdAtUnix
      const dayAgo = now - 86400
      const weekAgo = now - 86400 * 7
      const monthAgo = now - 86400 * 30

      if (dateFilter === 'today' && orderDate < dayAgo) return false
      if (dateFilter === 'week' && orderDate < weekAgo) return false
      if (dateFilter === 'month' && orderDate < monthAgo) return false
    }

    return true
  })

  // Stats
  const orderStats = {
    total: filteredOrders.length,
    active: filteredOrders.filter(o => o.status === 1 || o.status === 2).length,
    delivered: filteredOrders.filter(o => o.status === 3).length,
  }

  const vehicleStats = {
    total: vehicles.length,
    available: vehicles.filter(v => v.status === 'AVAILABLE').length,
    busy: vehicles.filter(v => v.status === 'BUSY').length,
  }

  const invoiceStats = {
    paid: invoices.filter(i => i.status === 2).reduce((sum, i) => sum + (i.amount || 0), 0),
    pending: invoices.filter(i => i.status === 0 || i.status === 1).length,
  }

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateStatusMutation.mutate({
      id: orderId,
      dto: { status: newStatus },
    })
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="p-6 h-[calc(100vh-48px)] flex flex-col">
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-semibold text-text-primary">Заказы</h1>
          
          {/* Quick stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Package className="w-4 h-4 text-accent-lavender" />
              <span className="text-text-muted">Всего:</span>
              <span className="font-medium text-text-primary">{orderStats.total}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-status-success" />
              <span className="text-text-muted">Активных:</span>
              <span className="font-medium text-status-success">{orderStats.active}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-accent-sky" />
              <span className="text-text-muted">Транспорт:</span>
              <span className="font-medium text-text-primary">{vehicleStats.available}/{vehicleStats.total}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-status-warning" />
              <span className="text-text-muted">Выручка:</span>
              <span className="font-medium text-text-primary">{formatCurrency(invoiceStats.paid)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-surface-hover rounded-lg transition-colors"
            title="Обновить"
          >
            <RefreshCw className="w-4 h-4 text-text-muted" />
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        dateFilter={dateFilter}
        onDateChange={setDateFilter}
        onCreateClick={() => setShowCreate(true)}
        statuses={statuses}
      />

      {/* Kaban board */}
      <div className="flex-1 overflow-hidden">
        <KabanBoard
          orders={filteredOrders}
          selectedId={selectedId}
          onOrderClick={setSelectedId}
          onStatusChange={handleStatusChange}
          statuses={statuses}
        />
      </div>

      {/* Create order modal */}
      <CreateOrderModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
      />
    </div>
  )
}