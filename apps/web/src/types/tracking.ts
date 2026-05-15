export interface TrackingPoint {
  lat: number
  lng: number
  timestampUnix: number
  speed?: number
  heading?: number
}

export interface TrackingHistory {
  vehicleId: string
  points: TrackingPoint[]
}

export interface TrackingHistoryQuery {
  from?: number
  to?: number
  maxPoints?: number
}

export interface LatestPosition {
  vehicleId: string
  lat: number
  lng: number
  timestampUnix: number
  speed?: number
  heading?: number
}
