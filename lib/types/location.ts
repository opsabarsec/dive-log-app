/**
 * Location data types for dive log locations and dive spots
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationData extends Coordinates {
  name: string;
  displayName?: string; // Full formatted address
}

export interface GeocodingResult {
  lat: number;
  lon: number;
  name: string;
  display_name: string;
  address?: {
    city?: string;
    country?: string;
    state?: string;
  };
}

export interface MapConfig {
  center: [number, number]; // [latitude, longitude]
  zoom: number;
}

export const DEFAULT_MAP_CENTER: [number, number] = [25.0, 0.0]; // Center of typical diving regions
export const DEFAULT_MAP_ZOOM = 2;
export const DEFAULT_LOCATION_ZOOM = 13;
