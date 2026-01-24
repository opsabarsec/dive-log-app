"use client";

import { useState, useCallback, useMemo } from "react";
import { Marker, useMapEvents } from "react-leaflet";
import { Icon } from "leaflet";
import BaseMap from "./BaseMap";
import LocationSearchInput from "./LocationSearchInput";
import { LocationData, DEFAULT_MAP_CENTER, DEFAULT_LOCATION_ZOOM } from "@/lib/types/location";

// Fix for default marker icons in Next.js
const defaultIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPickerProps {
  initialLocation?: LocationData;
  onLocationSelect: (location: LocationData) => void;
  className?: string;
}

/**
 * Interactive map component for picking a location
 * Features:
 * - Click on map to select location
 * - Drag marker to adjust position
 * - Search for locations using geocoding
 */
export default function LocationPicker({
  initialLocation,
  onLocationSelect,
  className,
}: LocationPickerProps) {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(
    initialLocation || null
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    initialLocation
      ? [initialLocation.latitude, initialLocation.longitude]
      : DEFAULT_MAP_CENTER
  );
  const [mapZoom, setMapZoom] = useState(
    initialLocation ? DEFAULT_LOCATION_ZOOM : 2
  );

  const handleLocationSelect = useCallback(
    (location: LocationData) => {
      setSelectedLocation(location);
      setMapCenter([location.latitude, location.longitude]);
      setMapZoom(DEFAULT_LOCATION_ZOOM);
      onLocationSelect(location);
    },
    [onLocationSelect]
  );

  return (
    <div className={className}>
      <LocationSearchInput
        onLocationSelect={handleLocationSelect}
        className="mb-4"
      />

      <div className="h-96 w-full">
        <BaseMap center={mapCenter} zoom={mapZoom} key={`${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}>
          <MapClickHandler onLocationSelect={handleLocationSelect} />
          {selectedLocation && (
            <DraggableMarker
              position={[selectedLocation.latitude, selectedLocation.longitude]}
              onPositionChange={handleLocationSelect}
            />
          )}
        </BaseMap>
      </div>

      {selectedLocation && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-700">Selected Location:</p>
          <p className="text-sm text-gray-900">{selectedLocation.displayName || selectedLocation.name}</p>
          <p className="text-xs text-gray-500 mt-1">
            Coordinates: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Component to handle map click events
 */
function MapClickHandler({
  onLocationSelect,
}: {
  onLocationSelect: (location: LocationData) => void;
}) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;

      // Try to reverse geocode the clicked location
      try {
        const { reverseGeocode } = await import("@/lib/geocoding");
        const result = await reverseGeocode(lat, lng);

        onLocationSelect({
          latitude: lat,
          longitude: lng,
          name: result?.name || "Unknown Location",
          displayName: result?.display_name,
        });
      } catch (error) {
        console.error("Error reverse geocoding:", error);
        // Fallback if geocoding fails
        onLocationSelect({
          latitude: lat,
          longitude: lng,
          name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        });
      }
    },
  });

  return null;
}

/**
 * Draggable marker component
 */
function DraggableMarker({
  position,
  onPositionChange,
}: {
  position: [number, number];
  onPositionChange: (location: LocationData) => void;
}) {
  const markerRef = useMemo(() => ({ current: null }), []);

  const eventHandlers = useMemo(
    () => ({
      async dragend() {
        const marker = markerRef.current as any;
        if (marker != null) {
          const { lat, lng } = marker.getLatLng();

          try {
            const { reverseGeocode } = await import("@/lib/geocoding");
            const result = await reverseGeocode(lat, lng);

            onPositionChange({
              latitude: lat,
              longitude: lng,
              name: result?.name || "Unknown Location",
              displayName: result?.display_name,
            });
          } catch (error) {
            console.error("Error reverse geocoding:", error);
            onPositionChange({
              latitude: lat,
              longitude: lng,
              name: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            });
          }
        }
      },
    }),
    [onPositionChange]
  );

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef as any}
      icon={defaultIcon}
    />
  );
}
