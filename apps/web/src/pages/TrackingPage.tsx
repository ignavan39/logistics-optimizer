import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import { Loader2, Navigation, History } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import { apiFetchWithAuth as apiFetch } from '@/lib/auth'
import { type TrackingPoint } from '@/types'
import { Button, Input } from '@/components/ui'

interface Vehicle {
  id: string
  current_location?: { lat: number; lng: number }
}

interface VehiclesResponse {
  vehicles: Vehicle[]
}

interface TrackingHistoryResponse {
  vehicleId: string
  points: TrackingPoint[]
}

const defaultCenter: [number, number] = [55.7558, 37.6173]

const truckIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background: #a8d8ea; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #fff;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f0f1a" stroke-width="2">
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
      <path d="M15 18H9"/>
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
      <circle cx="17" cy="18" r="2"/>
      <circle cx="7" cy="18" r="2"/>
    </svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

const pointIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background: #f59e0b; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #fff;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
})

export function TrackingPage() {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter)
  const [activeTab, setActiveTab] = useState<'realtime' | 'history'>('realtime')
  const [historyFrom, setHistoryFrom] = useState('')
  const [historyTo, setHistoryTo] = useState('')

  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery<VehiclesResponse>({
    queryKey: ['vehicles'],
    queryFn: () => apiFetch('/vehicles'),
    refetchInterval: activeTab === 'realtime' ? 30000 : false,
  })

  const { data: trackingHistory, isLoading: historyLoading, refetch: refetchHistory } = useQuery<TrackingHistoryResponse>({
    queryKey: ['tracking', selectedVehicle, 'history', historyFrom, historyTo],
    queryFn: () => {
      const params = new URLSearchParams()
      if (historyFrom) params.append('from', String(Math.floor(new Date(historyFrom).getTime() / 1000)))
      if (historyTo) params.append('to', String(Math.floor(new Date(historyTo).getTime() / 1000)))
      params.append('max_points', '100')
      return apiFetch(`/tracking/${selectedVehicle}/history?${params.toString()}`)
    },
    enabled: !!selectedVehicle && activeTab === 'history',
  })

  const vehicles = vehiclesData?.vehicles || []
  const vehiclesWithLocation = vehicles.filter(v => v.current_location?.lat && v.current_location?.lng)

  const selected = vehicles.find(v => v.id === selectedVehicle)
  useEffect(() => {
    if (selected?.current_location) {
      setMapCenter([selected.current_location.lat, selected.current_location.lng])
    }
  }, [selected])

  const historyPoints = trackingHistory?.points || []
  const polylinePositions: [number, number][] = historyPoints.map(p => [p.lat, p.lng])

  useEffect(() => {
    if (historyPoints.length > 0) {
      const bounds = L.latLngBounds(historyPoints.map(p => [p.lat, p.lng]))
      const center = bounds.getCenter()
      setMapCenter([center.lat, center.lng])
    }
  }, [historyPoints])

  const renderMap = () => {
    if (activeTab === 'history' && historyPoints.length > 0) {
      return (
        <>
          <Polyline positions={polylinePositions} color="#f59e0b" weight={3} opacity={0.8} />
          {historyPoints.map((point, idx) => (
            <Marker key={idx} position={[point.lat, point.lng]} icon={pointIcon}>
              <Popup>
                <div className="text-background">
                  <p className="text-xs">
                    {new Date(point.timestampUnix * 1000).toLocaleString('ru-RU')}
                    {point.speed !== undefined && <span> | {point.speed} км/ч</span>}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </>
      )
    }

    return vehiclesWithLocation.map((vehicle) => (
      <Marker
        key={vehicle.id}
        position={[vehicle.current_location!.lat, vehicle.current_location!.lng]}
        icon={truckIcon}
        eventHandlers={{
          click: () => setSelectedVehicle(vehicle.id),
        }}
      >
        <Popup>
          <div className="text-background">
            <p className="font-medium">{vehicle.id.slice(0, 8)}</p>
          </div>
        </Popup>
      </Marker>
    ))
  }

  return (
    <div className="p-6 h-[calc(100vh-48px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-text-primary">Трекинг</h1>
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          {activeTab === 'realtime' && (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Обновление каждые 30 сек
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 bg-surface rounded-xl border border-border overflow-hidden relative">
          {(vehiclesLoading || historyLoading) && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/80 z-[1000]">
              <Loader2 className="w-8 h-8 text-accent-lavender animate-spin" />
            </div>
          )}
          <MapContainer
            center={mapCenter}
            zoom={10}
            className="h-full w-full"
            style={{ background: '#1a1a2e' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            {renderMap()}
          </MapContainer>
        </div>

        <div className="w-72 bg-surface rounded-xl border border-border overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setActiveTab('realtime')}
                className={`flex-1 py-1 px-2 rounded text-sm ${
                  activeTab === 'realtime' ? 'bg-accent-lavender text-background' : 'text-text-muted'
                }`}
              >
                Карта
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-1 px-2 rounded text-sm flex items-center justify-center gap-1 ${
                  activeTab === 'history' ? 'bg-accent-lavender text-background' : 'text-text-muted'
                }`}
              >
                <History className="w-3 h-3" />История
              </button>
            </div>
            <h2 className="font-medium text-text-primary">
              {activeTab === 'realtime' ? `Транспорт (${vehiclesWithLocation.length})` : 'История'}
            </h2>
          </div>

          {activeTab === 'realtime' ? (
            <div className="flex-1 overflow-y-auto">
              {vehiclesWithLocation.map((vehicle) => (
                <button
                  key={vehicle.id}
                  onClick={() => setSelectedVehicle(vehicle.id)}
                  className={`w-full p-3 text-left border-b border-border transition-colors hover:bg-surface-hover ${
                    selectedVehicle === vehicle.id ? 'bg-surface-hover border-l-2 border-l-accent-lavender' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-accent-lavender" />
                    <span className="text-text-primary font-medium">{vehicle.id.slice(0, 8)}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {vehicle.current_location?.lat.toFixed(4)}, {vehicle.current_location?.lng.toFixed(4)}
                  </p>
                </button>
              ))}
              {vehiclesWithLocation.length === 0 && (
                <div className="p-4 text-center text-text-muted text-sm">
                  Нет данных о местоположении
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <div className="space-y-2">
                <Input
                  type="datetime-local"
                  label="С"
                  value={historyFrom}
                  onChange={(e) => setHistoryFrom(e.target.value)}
                />
                <Input
                  type="datetime-local"
                  label="По"
                  value={historyTo}
                  onChange={(e) => setHistoryTo(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={() => refetchHistory()}
                  disabled={!selectedVehicle}
                  className="w-full"
                >
                  Загрузить историю
                </Button>
              </div>

              {historyPoints.length > 0 && (
                <div className="text-sm text-text-muted">
                  Точек: {historyPoints.length}
                </div>
              )}

              {historyPoints.length === 0 && selectedVehicle && (
                <div className="p-4 text-center text-text-muted text-sm">
                  Нет данных за выбранный период
                </div>
              )}

              {!selectedVehicle && (
                <div className="p-4 text-center text-text-muted text-sm">
                  Выберите транспорт из списка
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
