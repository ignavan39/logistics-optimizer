import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import { Loader2, Package } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import { apiFetchWithAuth as apiFetch } from '@/lib/auth'
import { osrmApi } from '@/lib/api.clients'
import type { OrderStatus } from '@/types'

interface Order {
  id: string
  status: OrderStatus
  origin?: { lat: number; lng: number }
  destination?: { lat: number; lng: number }
}

const defaultCenter: [number, number] = [55.7558, 37.6173]

const originIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background: #a8d8ea; width: 16px; height: 16px; border-radius: 50%; border: 2px solid #fff;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const destIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background: #22c55e; width: 16px; height: 16px; border-radius: 50%; border: 2px solid #fff;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const getStatusColor = (status: OrderStatus): string => {
  const colors: Record<OrderStatus, string> = {
    0: '#a8d8ea',
    1: '#f59e0b',
    2: '#22c55e',
    3: '#ef4444',
    4: '#6b7280'
  }
  return colors[status] || '#6b7280'
}

const getStatusLabel = (status: OrderStatus): string => {
  const labels: Record<OrderStatus, string> = {
    0: 'Новый',
    1: 'В пути',
    2: 'Доставлен',
    3: 'Проблема',
    4: 'Отменен'
  }
  return labels[status] || 'Неизвестно'
}

export function TrackingPage() {
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null)
  const [orderRoutes, setOrderRoutes] = useState<Record<string, [number, number][]>>({})
  const [loadingRoutes, setLoadingRoutes] = useState(false)
  const [activeStatus, setActiveStatus] = useState<string>('all')

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', 'all', 'active'],
    queryFn: () => apiFetch<{ orders: Order[] }>('/orders?limit=200'),
  })

  const orders = ordersData?.orders || []
  const ordersWithGeo = orders.filter(o => o.origin?.lat && o.destination?.lat)
  const filteredOrders = activeStatus === 'all' 
    ? ordersWithGeo 
    : ordersWithGeo.filter(o => o.status === Number(activeStatus))

  useEffect(() => {
    const fetchRoutes = async () => {
      if (filteredOrders.length === 0) return
      
      setLoadingRoutes(true)
      const newRoutes: Record<string, [number, number][]> = {}
      
      for (const order of filteredOrders.slice(0, 50)) {
        if (!order.origin || !order.destination) continue
        try {
          const result = await osrmApi.route(
            order.origin.lng,
            order.origin.lat,
            order.destination.lng,
            order.destination.lat
          )
          if (result.geometry?.coordinates?.length) {
            newRoutes[order.id] = result.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]])
          }
        } catch (e) {
          console.error('[Tracking] Route error for order', order.id, e)
        }
      }

      setOrderRoutes(newRoutes)
      setLoadingRoutes(false)
    }

    fetchRoutes()
  }, [ordersData, activeStatus])

  const selected = orders.find(o => o.id === selectedOrder)

  return (
    <div className="p-6 h-[calc(100vh-48px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-text-primary">Трекинг</h1>
        <div className="flex items-center gap-2">
          <select
            value={activeStatus}
            onChange={(e) => setActiveStatus(e.target.value)}
            className="bg-surface border border-border rounded px-3 py-1.5 text-sm text-text-primary"
          >
            <option value="all">Все статусы</option>
            <option value="0">Новые</option>
            <option value="1">В пути</option>
            <option value="2">Доставленные</option>
          </select>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 bg-surface rounded-xl border border-border overflow-hidden relative">
          {(isLoading || loadingRoutes) && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-[1000]">
              <Loader2 className="w-8 h-8 text-accent-lavender animate-spin" />
            </div>
          )}
          <MapContainer
            center={defaultCenter}
            zoom={10}
            className="h-full w-full"
            style={{ background: '#1a1a2e' }}
          >
            <TileLayer
              attribution=''
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {filteredOrders.map((order) => {
              const route = orderRoutes[order.id]
              const isSelected = selectedOrder === order.id
              const color = getStatusColor(order.status)
              
              return (
                <React.Fragment key={order.id}>
                  {order.origin && (
                    <Marker position={[order.origin.lat, order.origin.lng]} icon={originIcon}>
                      <Popup>
                        <div className="text-background">
                          <p className="font-medium">{order.id.slice(0, 8)}</p>
                          <p className="text-xs">{getStatusLabel(order.status)}</p>
                          <p className="text-xs">Откуда</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                  {order.destination && (
                    <Marker position={[order.destination.lat, order.destination.lng]} icon={destIcon}>
                      <Popup>
                        <div className="text-background">
                          <p className="font-medium">{order.id.slice(0, 8)}</p>
                          <p className="text-xs">Куда</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                  {route && (
                    <Polyline 
                      positions={route} 
                      color={color} 
                      weight={isSelected ? 4 : 2} 
                      opacity={isSelected ? 0.9 : 0.5}
                      eventHandlers={{
                        click: () => setSelectedOrder(order.id),
                      }}
                    />
                  )}
                </React.Fragment>
              )
            })}
          </MapContainer>
        </div>

        <div className="w-72 bg-surface rounded-xl border border-border overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border">
            <h2 className="font-medium text-text-primary">
              <Package className="w-4 h-4 inline mr-2" />
              Заказы ({filteredOrders.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredOrders.map((order) => {
              const isSelected = selectedOrder === order.id
              const color = getStatusColor(order.status)
              
              return (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order.id)}
                  className={`w-full p-3 text-left border-b border-border transition-colors hover:bg-surface-hover ${
                    isSelected ? 'bg-surface-hover border-l-2 border-l-accent-lavender' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-text-primary font-medium">{order.id.slice(0, 8)}</span>
                    <span 
                      className="text-xs px-2 py-0.5 rounded"
                      style={{ backgroundColor: color + '20', color }}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  {order.origin && order.destination && (
                    <p className="text-xs text-text-muted mt-1">
                      {order.origin.lat.toFixed(2)}, {order.origin.lng.toFixed(2)} → {order.destination.lat.toFixed(2)}, {order.destination.lng.toFixed(2)}
                    </p>
                  )}
                </button>
              )
            })}
            {filteredOrders.length === 0 && (
              <div className="p-4 text-center text-text-muted text-sm">
                Нет заказов с маршрутами
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}