// Leaflet fix for TypeScript
declare module 'leaflet' {
  export function divIcon(options?: Leaflet.DivIconOptions): Leaflet.DivIcon;
}

export {};