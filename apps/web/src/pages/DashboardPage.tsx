import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet'
import { Truck, Package, FileText, TrendingUp } from 'lucide-react'
import { apiFetchWithAuth as apiFetch } from '@/lib/auth'
import { PageLoader, Badge } from '@/components/ui'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, VEHICLE_STATUS_COLORS } from '@/types'
import L from 'leaflet'

const defaultCenter: [number, number] = [55.7558, 37.6173]

const truckIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background: #a8d8ea; width: 20px; height: 20px; border-radius: 50%; border: 2px solid #fff;"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

interface DashboardStats {
  orders: {
    total: number
    byStatus: Record<number, number>
    active: number
  }
  vehicles: {
    total: number
    available: number
    busy: number
    maintenance: number
  }
  invoices: {
    total: number
    paid: number
    pending: number
    amount: number
  }
}

export function DashboardPage() {
  const { data: ordersData, isLoading: ordersLoading } = useQuery<{ orders: { id: string; status: number; origin?: { lat: number; lng: number }; destination?: { lat: number; lng: number } }[] }>({
    queryKey: ['orders', 'all'],
    queryFn: () => apiFetch('/orders?limit=100'),
  })

  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery<{ vehicles: { id: string; status: string; current_location?: { lat: number; lng: number } }[] }>({
    queryKey: ['vehicles'],
    queryFn: () => apiFetch('/vehicles'),
  })

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<{ items: { status: number; amount: number }[] }>({
    queryKey: ['invoices', 'all'],
    queryFn: () => apiFetch('/invoices?limit=100'),
  })

  const isLoading = ordersLoading || vehiclesLoading || invoicesLoading

  if (isLoading) return <PageLoader />

  const orders = ordersData?.orders || []
  const vehicles = vehiclesData?.vehicles || []
  const invoices = invoicesData?.items || []

  const orderStats = {
    total: orders.length,
    created: orders.filter(o => o.status === 0).length,
    assigned: orders.filter(o => o.status === 1).length,
    inTransit: orders.filter(o => o.status === 2).length,
    delivered: orders.filter(o => o.status === 3).length,
    cancelled: orders.filter(o => o.status === 4).length,
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

  const activeOrders = orders.filter(o => o.status === 1 || o.status === 2)
  const vehiclesWithLocation = vehicles.filter(v => v.current_location?.lat && v.current_location?.lng)

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Дашборд</h1>

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

      {/* Orders by Status */}
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
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-medium text-text-primary">Карта активности</h3>
        </div>
        <div className="h-80">
          <MapContainer
            center={defaultCenter}
            zoom={10}
            className="h-full w-full"
            style={{ background: '#1a1a2e' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            {/* Active orders route lines */}
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

            {/* Vehicle markers */}
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
    </div>
  )
}