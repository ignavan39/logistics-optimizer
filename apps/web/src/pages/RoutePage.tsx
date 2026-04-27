import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet'
import { Loader2, Navigation, MapPin } from 'lucide-react'
import { apiPost } from '@/lib/api'
import { type Route, type GeoPoint, type CalculateRouteDto } from '@/types'
import { Button, PageLoader, Input } from '@/components/ui'
import L from 'leaflet'

const defaultCenter: [number, number] = [55.7558, 37.6173]

const markerIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background: #a8d8ea; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #fff;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f0f1a" stroke-width="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
})

const destinationIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background: #22c55e; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #fff;">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f0f1a" stroke-width="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
})

export function RoutePage() {
  const [form, setForm] = useState({
    originLat: '55.7558',
    originLng: '37.6173',
    destinationLat: '59.9311',
    destinationLng: '30.3609',
  })
  const [route, setRoute] = useState<Route | null>(null)
  const [showForm, setShowForm] = useState(true)

  const calculateMutation = useMutation({
    mutationFn: (dto: CalculateRouteDto) => apiPost<Route>('/routes/calculate', dto),
    onSuccess: (data) => {
      setRoute(data)
      setShowForm(false)
    },
  })

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault()
    calculateMutation.mutate({
      origin: { lat: Number(form.originLat), lng: Number(form.originLng) },
      destination: { lat: Number(form.destinationLat), lng: Number(form.destinationLng) },
    })
  }

  const waypoints: [number, number][] = route?.waypoints.map(w => [w.lat, w.lng]) || []

  const mapCenter: [number, number] = route?.waypoints.length
    ? [route.waypoints[Math.floor(route.waypoints.length / 2)].lat, route.waypoints[Math.floor(route.waypoints.length / 2)].lng]
    : defaultCenter

  return (
    <div className="p-6 h-[calc(100vh-48px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-text-primary">Маршруты</h1>
        {route && (
          <Button variant="secondary" size="sm" onClick={() => { setRoute(null); setShowForm(true); }}>
            Новый маршрут
          </Button>
        )}
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 bg-surface rounded-xl border border-border overflow-hidden relative">
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
            {route && (
              <>
                <Polyline positions={waypoints} color="#a8d8ea" weight={4} opacity={0.8} />
                <Marker position={[route.origin.lat, route.origin.lng]} icon={markerIcon}>
                  <Popup>
                    <div className="text-background">
                      <p className="font-medium">Точка отправления</p>
                    </div>
                  </Popup>
                </Marker>
                <Marker position={[route.destination.lat, route.destination.lng]} icon={destinationIcon}>
                  <Popup>
                    <div className="text-background">
                      <p className="font-medium">Пункт назначения</p>
                    </div>
                  </Popup>
                </Marker>
              </>
            )}
          </MapContainer>
        </div>

        <div className="w-80 bg-surface rounded-xl border border-border overflow-hidden flex flex-col p-4">
          {showForm ? (
            <form onSubmit={handleCalculate} className="space-y-4">
              <h3 className="font-medium text-text-primary">Построить маршрут</h3>
              
              <div className="space-y-2">
                <p className="text-sm text-text-muted">Точка отправления</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Широта"
                    type="number"
                    step="any"
                    value={form.originLat}
                    onChange={(e) => setForm(f => ({ ...f, originLat: e.target.value }))}
                    required
                  />
                  <Input
                    label="Долгота"
                    type="number"
                    step="any"
                    value={form.originLng}
                    onChange={(e) => setForm(f => ({ ...f, originLng: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-text-muted">Пункт назначения</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Широта"
                    type="number"
                    step="any"
                    value={form.destinationLat}
                    onChange={(e) => setForm(f => ({ ...f, destinationLat: e.target.value }))}
                    required
                  />
                  <Input
                    label="Долгота"
                    type="number"
                    step="any"
                    value={form.destinationLng}
                    onChange={(e) => setForm(f => ({ ...f, destinationLng: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <Button type="submit" disabled={calculateMutation.isPending} className="w-full">
                {calculateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Расчёт...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4 mr-2" />
                    Построить маршрут
                  </>
                )}
              </Button>
            </form>
          ) : route ? (
            <div className="space-y-4">
              <h3 className="font-medium text-text-primary">Маршрут</h3>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-surface-hover rounded-lg">
                  <MapPin className="w-4 h-4 text-accent-lavender" />
                  <div>
                    <p className="text-text-muted text-xs">Расстояние</p>
                    <p className="text-text-primary">
                      {route.distance ? `${Math.round(route.distance / 1000)} км` : '-'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-surface-hover rounded-lg">
                  <Navigation className="w-4 h-4 text-accent-lavender" />
                  <div>
                    <p className="text-text-muted text-xs">Время в пути</p>
                    <p className="text-text-primary">
                      {route.duration 
                        ? route.duration > 3600 
                          ? `${Math.floor(route.duration / 3600)}ч ${Math.floor((route.duration % 3600) / 60)}мин`
                          : `${Math.round(route.duration / 60)}мин`
                        : '-'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-surface-hover rounded-lg">
                  <MapPin className="w-4 h-4 text-accent-lavender" />
                  <div>
                    <p className="text-text-muted text-xs">Точек маршрута</p>
                    <p className="text-text-primary">{route.waypoints.length}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <div className="text-sm text-text-muted">Координаты</div>
                <div className="text-xs text-text-muted mt-1 space-y-1">
                  <p>От: {route.origin.lat.toFixed(4)}, {route.origin.lng.toFixed(4)}</p>
                  <p>До: {route.destination.lat.toFixed(4)}, {route.destination.lng.toFixed(4)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}