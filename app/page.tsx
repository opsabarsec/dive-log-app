"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { LocationData } from "@/lib/types/location";

// Dynamically import LocationPicker to avoid SSR issues with Leaflet
const LocationPicker = dynamic(
  () => import("@/components/map/LocationPicker"),
  { ssr: false }
);

export default function Home() {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);

  const handleLocationSelect = (location: LocationData) => {
    setSelectedLocation(location);
    console.log("Selected location:", location);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Dive Log App
          </h1>
          <p className="text-lg text-gray-600">
            Location Picker Demo - Using Leaflet + OpenStreetMap + Geoapify
          </p>
        </div>

        {/* Location Picker Demo */}
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            Select Dive Location
          </h2>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">
              Click on the map or search for a location to select your dive spot.
              You can also drag the marker to fine-tune the position.
            </p>
          </div>

          <LocationPicker
            onLocationSelect={handleLocationSelect}
            className="w-full"
          />

          {/* Display selected location details */}
          {selectedLocation && (
            <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Selected Location Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Name</p>
                  <p className="text-base text-gray-900">{selectedLocation.name}</p>
                </div>
                {selectedLocation.displayName && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">Full Address</p>
                    <p className="text-base text-gray-900">{selectedLocation.displayName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-600">Latitude</p>
                  <p className="text-base text-gray-900 font-mono">
                    {selectedLocation.latitude.toFixed(6)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Longitude</p>
                  <p className="text-base text-gray-900 font-mono">
                    {selectedLocation.longitude.toFixed(6)}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-white rounded border border-blue-100">
                <p className="text-sm font-medium text-gray-600 mb-2">JSON Output</p>
                <pre className="text-xs text-gray-700 overflow-x-auto">
                  {JSON.stringify(selectedLocation, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              How to Use
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="font-semibold mr-2">1.</span>
                <span>Type a location name in the search box to find a specific place</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">2.</span>
                <span>Click anywhere on the map to select that location</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">3.</span>
                <span>Drag the marker to adjust the exact position</span>
              </li>
              <li className="flex items-start">
                <span className="font-semibold mr-2">4.</span>
                <span>The location details will be displayed below the map</span>
              </li>
            </ul>
          </div>

          {/* Technology Info */}
          <div className="mt-6 p-6 bg-green-50 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Open Source Stack
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold text-green-800">Map Library</p>
                <p className="text-gray-700">Leaflet + react-leaflet</p>
              </div>
              <div>
                <p className="font-semibold text-green-800">Base Map</p>
                <p className="text-gray-700">OpenStreetMap via Geoapify</p>
              </div>
              <div>
                <p className="font-semibold text-green-800">Geocoding</p>
                <p className="text-gray-700">Geoapify API</p>
              </div>
            </div>
          </div>
        </div>

        {/* API Key Notice */}
        <div className="max-w-4xl mx-auto mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> To use the map, you need to add your Geoapify API key
            to <code className="bg-yellow-100 px-1 py-0.5 rounded">.env.local</code> as
            <code className="bg-yellow-100 px-1 py-0.5 rounded ml-1">NEXT_PUBLIC_GEOAPIFY_API_KEY</code>.
            Get a free API key at{" "}
            <a
              href="https://www.geoapify.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-yellow-900"
            >
              geoapify.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
