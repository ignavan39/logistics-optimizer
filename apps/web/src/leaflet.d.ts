// Leaflet fix for TypeScript
declare module 'leaflet' {
  export * from 'leaflet/core';
  export function divIcon(options?: Leaflet.DivIconOptions): Leaflet.DivIcon;
}

declare module 'react-leaflet' {
  import * as React from 'react';
  import * as Leaflet from 'leaflet';
  export { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
}