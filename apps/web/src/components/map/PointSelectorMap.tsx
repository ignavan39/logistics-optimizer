import { useState, useCallback, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, Loader2, X, Navigation } from 'lucide-react'
import { osrmApi } from '@/lib/api.clients'

export interface Point {
  lat: number
  lng: number
  address: string
}

interface PointSelectorMapProps {
  origin: Point | null
  destination: Point | null
  onOriginSelect: (point: Point) => void
  onDestinationSelect: (point: Point) => void
  onModeChange: (mode: 'origin' | 'destination') => void
  mode: 'origin' | 'destination'
  onClear: () => void
}

const originIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const destIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background: #22c55e; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const originPendingIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background: #93c5fd; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #3b82f6; animation: pulse 1s infinite;"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const destPendingIcon = L.divIcon({
  className: 'custom-icon',
  html: `<div style="background: #86efac; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #22c55e; animation: pulse 1s infinite;"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const defaultCenter: [number, number] = [55.7558, 37.6176]

async function getAddress(lat: number, lng: number): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      {
        headers: { 'User-Agent': 'LogisticsOptimizer/1.0 (contact@example.com)' },
        signal: controller.signal,
      }
    )
    clearTimeout(timeout)

    if (!res.ok) throw new Error('Geocoding failed')

    const data = await res.json()
    if (data.display_name) {
      const parts = data.display_name.split(', ')
      return parts.slice(0, 3).join(', ')
    }
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void
  disabled: boolean
}

function MapClickHandler({ onMapClick, disabled }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      if (!disabled) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

export function PointSelectorMap({
  origin,
  destination,
  onOriginSelect,
  onDestinationSelect,
  onModeChange,
  mode,
  onClear,
}: PointSelectorMapProps) {
  const [pendingPoint, setPendingPoint] = useState<{ lat: number; lng: number; loading: boolean } | null>(null)
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null)

  const handleMapClick = useCallback(async (lat: number, lng: number) => {
    setPendingPoint({ lat, lng, loading: true })

    const address = await getAddress(lat, lng)
    const point: Point = { lat, lng, address }

    if (mode === 'origin') {
      onOriginSelect(point)
      onModeChange('destination')
    } else {
      onDestinationSelect(point)
      onModeChange('origin')
    }

    setPendingPoint(null)
  }, [mode, onOriginSelect, onDestinationSelect, onModeChange])

  const fetchRoute = useCallback(async () => {
    if (!origin || !destination) {
      setRouteCoords(null)
      return
    }

    try {
      const result = await osrmApi.route(
        origin.lng,
        origin.lat,
        destination.lng,
        destination.lat
      )
      if (result.geometry?.coordinates?.length) {
        setRouteCoords(result.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]))
        return
      }
    } catch {
      // OSRM unavailable — just show points
    }
    setRouteCoords(null)
  }, [origin, destination])

  useEffect(() => {
    fetchRoute()
  }, [fetchRoute])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
          mode === 'origin'
            ? 'bg-blue-100 text-blue-700 border border-blue-300'
            : 'bg-surface border border-border text-text-secondary hover:border-blue-300'
        }`} onClick={() => onModeChange('origin')}>
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-sm font-medium">Откуда</span>
          {origin && <span className="text-xs text-blue-600">✓</span>}
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors ${
          mode === 'destination'
            ? 'bg-green-100 text-green-700 border border-green-300'
            : 'bg-surface border border-border text-text-secondary hover:border-green-300'
        }`} onClick={() => onModeChange('destination')}>
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm font-medium">Куда</span>
          {destination && <span className="text-xs text-green-600">✓</span>}
        </div>
        <button
          onClick={onClear}
          className="ml-auto p-1.5 hover:bg-surface-hover rounded text-text-muted hover:text-text-primary"
          title="Очистить всё"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="h-64 rounded-xl overflow-hidden border border-border relative">
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
          <MapClickHandler onMapClick={handleMapClick} disabled={false} />

          {origin && (
            <Marker
              position={[origin.lat, origin.lng]}
              icon={mode === 'origin' ? originPendingIcon : originIcon}
            />
          )}
          {destination && (
            <Marker
              position={[destination.lat, destination.lng]}
              icon={mode === 'destination' ? destPendingIcon : destIcon}
            />
          )}
          {routeCoords && <Polyline positions={routeCoords} color="#8b5cf6" weight={3} opacity={0.7} />}
        </MapContainer>

        {pendingPoint?.loading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-[1000]">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {!origin && !destination && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 px-4 py-2 rounded-lg text-white text-sm">
              Кликните на карту чтобы выбрать точку
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 text-sm">
        {origin && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
            <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-blue-600 font-medium">Откуда</div>
              <div className="text-text-primary truncate">{origin.address}</div>
              <div className="text-xs text-text-muted">{origin.lat.toFixed(5)}, {origin.lng.toFixed(5)}</div>
            </div>
          </div>
        )}
        {destination && (
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-100">
            <Navigation className="w-4 h-4 text-green-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-green-600 font-medium">Куда</div>
              <div className="text-text-primary truncate">{destination.address}</div>
              <div className="text-xs text-text-muted">{destination.lat.toFixed(5)}, {destination.lng.toFixed(5)}</div>
            </div>
          </div>
        )}
        {!origin && !destination && (
          <div className="text-center text-text-muted text-sm py-2">
            Точки ещё не выбраны
          </div>
        )}
      </div>

      {origin && destination && routeCoords && (
        <div className="text-xs text-text-muted text-center">
          Маршрут построен • Расстояние: {((routeCoords.length * 0.01)).toFixed(1)} км (приблизительно)
        </div>
      )}
    </div>
  )
}