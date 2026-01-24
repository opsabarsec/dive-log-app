"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

interface BaseMapProps {
  center: LatLngExpression;
  zoom: number;
  children?: React.ReactNode;
  className?: string;
  scrollWheelZoom?: boolean;
}

/**
 * Component to debug map loading
 */
function MapDebugger() {
  const map = useMap();

  useEffect(() => {
    console.log("Map initialized:", map);
    console.log("Map container size:", map.getSize());
    console.log("Map center:", map.getCenter());
    console.log("Map zoom:", map.getZoom());

    // Force map to invalidate size (fixes common rendering issues)
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);

  return null;
}

/**
 * Base map component using Leaflet with Geoapify tiles
 * Uses OpenStreetMap data via Geoapify
 */
export default function BaseMap({
  center,
  zoom,
  children,
  className = "h-96 w-full rounded-lg",
  scrollWheelZoom = true,
}: BaseMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

  if (!apiKey) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300`}>
        <div className="text-center p-4">
          <p className="text-red-600 font-semibold">Geoapify API key not configured</p>
          <p className="text-sm text-gray-600 mt-2">
            Please add NEXT_PUBLIC_GEOAPIFY_API_KEY to your .env.local file
          </p>
        </div>
      </div>
    );
  }

  const tileUrl = `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${apiKey}`;
  console.log("Tile URL (check this in browser):", tileUrl.replace(apiKey, "***"));

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom={scrollWheelZoom}
      className={className}
      style={{ height: "100%", width: "100%", minHeight: "400px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.geoapify.com/">Geoapify</a>'
        url={tileUrl}
        eventHandlers={{
          tileerror: (error) => {
            console.error("Tile loading error:", error);
          },
          tileload: () => {
            console.log("Tile loaded successfully");
          },
        }}
      />
      <MapDebugger />
      {children}
    </MapContainer>
  );
}
