# Map Implementation Guide

This document describes the open-source map implementation for the Dive Log App using Leaflet, OpenStreetMap, and Geoapify.

## Technology Stack

### Frontend Map Library
- **[Leaflet](https://leafletjs.com/)** v1.9.4 - Open-source JavaScript library for interactive maps
- **[react-leaflet](https://react-leaflet.js.org/)** v4.2.1 - React components for Leaflet

### Map Data & Services
- **Base Map Tiles**: OpenStreetMap data served via [Geoapify](https://www.geoapify.com/)
- **Geocoding**: Geoapify Geocoding API
- **Reverse Geocoding**: Convert coordinates to addresses

## Getting Started

### 1. Get Geoapify API Key

1. Sign up for a free account at [geoapify.com](https://www.geoapify.com/)
2. Get your API key from the dashboard
3. Free tier includes:
   - 3,000 requests per day
   - No credit card required

### 2. Configure Environment Variables

Add your API key to `.env.local`:

```bash
NEXT_PUBLIC_GEOAPIFY_API_KEY=your_api_key_here
```

See `.env.example` for reference.

### 3. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the location picker demo.

## Components

### LocationPicker

The main component for selecting locations on a map.

**Features:**
- Interactive map with click-to-select
- Draggable marker for precise positioning
- Location search with autocomplete
- Reverse geocoding to get location names
- Returns structured location data

**Usage:**

```tsx
import { LocationPicker } from "@/components/map";
import { LocationData } from "@/lib/types/location";

function DiveForm() {
  const handleLocationSelect = (location: LocationData) => {
    console.log("Selected:", location);
    // location contains: latitude, longitude, name, displayName
  };

  return (
    <LocationPicker
      onLocationSelect={handleLocationSelect}
      initialLocation={existingLocation} // optional
    />
  );
}
```

### BaseMap

Low-level map component using Leaflet with Geoapify tiles.

**Usage:**

```tsx
import { BaseMap } from "@/components/map";
import { Marker } from "react-leaflet";

function CustomMap() {
  return (
    <BaseMap center={[51.505, -0.09]} zoom={13}>
      <Marker position={[51.505, -0.09]} />
    </BaseMap>
  );
}
```

### LocationSearchInput

Autocomplete search input for finding locations.

**Usage:**

```tsx
import { LocationSearchInput } from "@/components/map";

function SearchForm() {
  return (
    <LocationSearchInput
      onLocationSelect={(location) => console.log(location)}
      placeholder="Search for a dive spot..."
    />
  );
}
```

## Data Types

### LocationData

```typescript
interface LocationData {
  latitude: number;
  longitude: number;
  name: string;
  displayName?: string; // Full formatted address
}
```

### GeocodingResult

```typescript
interface GeocodingResult {
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
```

## Database Schema Updates

The `dives` table now includes location coordinates:

```typescript
dives: {
  // ... other fields
  location: string,           // Location name
  latitude: number?,          // NEW: GPS latitude
  longitude: number?,         // NEW: GPS longitude
}
```

The `diveSpots` table already had these fields:

```typescript
diveSpots: {
  // ... other fields
  location: string,
  latitude: number?,
  longitude: number?,
}
```

## API Utilities

### Search Location

```typescript
import { searchLocation } from "@/lib/geocoding";

const results = await searchLocation("Great Barrier Reef");
// Returns array of GeocodingResult
```

### Reverse Geocode

```typescript
import { reverseGeocode } from "@/lib/geocoding";

const result = await reverseGeocode(-16.5, 145.7);
// Returns GeocodingResult with location name and address
```

## File Structure

```
dive-log-app/
├── app/
│   ├── page.tsx              # Demo page with LocationPicker
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   └── map/
│       ├── BaseMap.tsx       # Base Leaflet map component
│       ├── LocationPicker.tsx # Main location picker
│       ├── LocationSearchInput.tsx # Search autocomplete
│       └── index.ts          # Barrel exports
├── lib/
│   ├── geocoding.ts          # Geocoding API utilities
│   └── types/
│       └── location.ts       # TypeScript types
└── convex/
    └── schema.ts             # Updated with lat/lng fields
```

## Next Steps

### Integration Ideas

1. **Dive Form Integration**
   - Add LocationPicker to create/edit dive forms
   - Store coordinates when logging dives
   - Display dive location on dive detail pages

2. **Dive Spots Map View**
   - Create a page showing all dive spots on a map
   - Add clustering for many spots
   - Filter by difficulty, rating, etc.

3. **Dashboard Map**
   - Show recent dives on overview map
   - Display dive statistics by region
   - Link to detailed dive views

4. **Advanced Features**
   - Draw dive routes/paths
   - Calculate distances between spots
   - Weather overlay for dive planning
   - Depth contours (bathymetry)

## Customization

### Change Map Style

Geoapify offers different map styles. Update the tile URL in `BaseMap.tsx`:

```typescript
// Available styles: osm-bright, osm-carto, osm-liberty, klokantech-basic
url={`https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=${apiKey}`}
```

### Add Custom Markers

```tsx
import L from "leaflet";

const diveIcon = L.icon({
  iconUrl: "/icons/dive-marker.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

<Marker position={position} icon={diveIcon} />
```

### Enable Clustering

Install the plugin:

```bash
npm install react-leaflet-cluster
```

Use it to group nearby markers:

```tsx
import MarkerClusterGroup from "react-leaflet-cluster";

<BaseMap>
  <MarkerClusterGroup>
    {diveSpots.map(spot => (
      <Marker key={spot.id} position={[spot.lat, spot.lon]} />
    ))}
  </MarkerClusterGroup>
</BaseMap>
```

## Troubleshooting

### Map not displaying

1. Check that `NEXT_PUBLIC_GEOAPIFY_API_KEY` is set in `.env.local`
2. Restart the dev server after adding environment variables
3. Check browser console for API errors

### "window is not defined" error

The components use `"use client"` directive and dynamic imports to prevent SSR issues:

```tsx
const LocationPicker = dynamic(
  () => import("@/components/map/LocationPicker"),
  { ssr: false }
);
```

### Marker icons not showing

The BaseMap component loads marker icons from CDN. Ensure you have internet connection or download icons locally.

## Resources

- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [react-leaflet Documentation](https://react-leaflet.js.org/)
- [Geoapify API Docs](https://www.geoapify.com/api-documentation)
- [OpenStreetMap](https://www.openstreetmap.org/)

## License

This implementation uses:
- Leaflet: BSD 2-Clause License
- OpenStreetMap: ODbL (Open Database License)
- Geoapify: Free tier available, check [pricing](https://www.geoapify.com/pricing)
