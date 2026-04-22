import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Loader2, Navigation } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import L from 'leaflet'
import { apiFetchWithAuth as apiFetch } from '@/lib/auth'

interface Vehicle {
  id: string
  current_location?: { lat: number; lng: number }
}

interface VehiclesResponse {
  vehicles: Vehicle[]
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

export function TrackingPage() {
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>(defaultCenter)

  const { data: vehiclesData, isLoading: vehiclesLoading } = useQuery<VehiclesResponse>({
    queryKey: ['vehicles'],
    queryFn: () => apiFetch('/vehicles'),
    refetchInterval: 30000,
  })

  const vehicles = vehiclesData?.vehicles || []
  const vehiclesWithLocation = vehicles.filter(v => v.current_location?.lat && v.current_location?.lng)

  const selected = vehicles.find(v => v.id === selectedVehicle)
  useEffect(() => {
    if (selected?.current_location) {
      setMapCenter([selected.current_location.lat, selected.current_location.lng])
    }
  }, [selected])

  return (
    <div className="p-6 h-[calc(100vh-48px)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold text-text-primary">Трекинг</h1>
        <div className="flex items-center gap-2 text-text-secondary text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Обновление каждые 30 сек
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 bg-surface rounded-xl border border-border overflow-hidden relative">
          {vehiclesLoading && (
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
            {vehiclesWithLocation.map((vehicle) => (
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
            ))}
          </MapContainer>
        </div>

        <div className="w-72 bg-surface rounded-xl border border-border overflow-hidden flex flex-col">
          <div className="p-3 border-b border-border">
            <h2 className="font-medium text-text-primary">Транспорт ({vehiclesWithLocation.length})</h2>
          </div>
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
        </div>
      </div>
    </div>
  )
}

