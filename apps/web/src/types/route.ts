export interface GeoPoint {
  lat: number
  lng: number
}

export interface Route {
  id: string
  orderId?: string
  vehicleId?: string
  origin: GeoPoint
  destination: GeoPoint
  distance?: number
  duration?: number
  waypoints: GeoPoint[]
  createdAtUnix: number
}

export interface CalculateRouteDto {
  orderId?: string
  vehicleId?: string
  origin: GeoPoint
  destination: GeoPoint
}