# Location Integration Guide

This guide shows how to integrate the LocationPicker component with Convex mutations to save dive locations.

## Quick Start

### 1. Use LocationPicker Component

```tsx
import { LocationPicker } from "@/components/map";
import { LocationData } from "@/lib/types/location";

function MyComponent() {
  const [location, setLocation] = useState<LocationData | null>(null);

  return (
    <LocationPicker
      onLocationSelect={(location) => setLocation(location)}
    />
  );
}
```

### 2. Save to Convex Database

```tsx
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function DiveForm() {
  const createDive = useMutation(api.dives.createDive);
  const [location, setLocation] = useState<LocationData | null>(null);

  const handleSubmit = async () => {
    if (!location) return;

    const diveId = await createDive({
      userId: "user-123",
      diveNumber: 1,         // Dive number
      diveDate: Date.now(),
      location: location.displayName || location.name,
      latitude: location.latitude,
      longitude: location.longitude,
      // ... other dive fields
      duration: 45,
      maxDepth: 20,
      waterType: "saltwater",
      suitThickness: 5,      // Wetsuit thickness in mm
      leadWeights: 4,        // Lead weights in kg
      buddyIds: [],
      equipment: [],
    });

    console.log("Dive created:", diveId);
  };

  return (
    <form onSubmit={handleSubmit}>
      <LocationPicker onLocationSelect={setLocation} />
      <button type="submit">Log Dive</button>
    </form>
  );
}
```

## Updated Convex API

### createDive Mutation

The `createDive` mutation now accepts location coordinates:

```typescript
// convex/dives.ts
export const createDive = mutation({
  args: {
    userId: v.string(),
    diveNumber: v.optional(v.number()), // Dive number (optional, recommended)
    diveDate: v.number(),           // Dive date (timestamp)
    location: v.string(),           // Location name/address
    latitude: v.optional(v.number()), // GPS latitude
    longitude: v.optional(v.number()), // GPS longitude
    site: v.optional(v.string()),
    duration: v.number(),
    maxDepth: v.number(),
    temperature: v.optional(v.number()),
    waterType: v.string(),
    visibility: v.optional(v.number()),
    weather: v.optional(v.string()),
    suitThickness: v.optional(v.number()),
    leadWeights: v.optional(v.number()),
    notes: v.optional(v.string()),
    buddyIds: v.array(v.string()),
    equipment: v.array(v.string()),
  },
  // ...
});
```

### updateDive Mutation

The `updateDive` mutation also supports updating location:

```typescript
const updateDive = useMutation(api.dives.updateDive);

await updateDive({
  diveId: existingDiveId,
  updates: {
    location: newLocation.displayName,
    latitude: newLocation.latitude,
    longitude: newLocation.longitude,
    // ... other fields
  },
});
```

## LocationData Type

The LocationPicker returns this structure:

```typescript
interface LocationData {
  latitude: number;        // GPS latitude (-90 to 90)
  longitude: number;       // GPS longitude (-180 to 180)
  name: string;           // Short location name
  displayName?: string;   // Full formatted address (optional)
}
```

## Example: Complete Dive Form

See the complete example in:
- Component: [components/forms/DiveForm.tsx](components/forms/DiveForm.tsx)
- Demo Page: [app/demo-form/page.tsx](app/demo-form/page.tsx)

Visit `/demo-form` to see it in action!

## Querying Dives with Location

```typescript
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function MyDives() {
  const dives = useQuery(api.dives.getDives, { userId: "user-123" });

  return (
    <div>
      {dives?.map((dive) => (
        <div key={dive._id}>
          <h3>{dive.location}</h3>
          {dive.latitude && dive.longitude && (
            <p>
              Coordinates: {dive.latitude.toFixed(4)}, {dive.longitude.toFixed(4)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
```

## Display Dive Location on Map

```tsx
import { BaseMap } from "@/components/map";
import { Marker } from "react-leaflet";

function DiveDetail({ dive }) {
  if (!dive.latitude || !dive.longitude) {
    return <p>No location data</p>;
  }

  return (
    <BaseMap center={[dive.latitude, dive.longitude]} zoom={13}>
      <Marker position={[dive.latitude, dive.longitude]} />
    </BaseMap>
  );
}
```

## Database Schema

The `dives` table includes these location fields:

```typescript
dives: {
  // ... other fields
  diveNumber: number?,       // Optional: dive number (recommended for tracking)
  diveDate: number,          // Required: dive date (timestamp)
  location: string,          // Required: location name
  latitude: number?,         // Optional: GPS latitude
  longitude: number?,        // Optional: GPS longitude
  site: string?,            // Optional: specific dive site name
  suitThickness: number?,   // Optional: wetsuit thickness in mm
  leadWeights: number?,     // Optional: lead weights in kg
}
```

## Best Practices

1. **Always save both name and coordinates**
   - `location`: For display and search
   - `latitude/longitude`: For map display and geospatial queries

2. **Use displayName when available**
   ```tsx
   location: location.displayName || location.name
   ```

3. **Handle missing coordinates gracefully**
   ```tsx
   {dive.latitude && dive.longitude && (
     <MapView lat={dive.latitude} lon={dive.longitude} />
   )}
   ```

4. **Validate coordinates**
   ```tsx
   const isValidCoordinate = (lat: number, lon: number) => {
     return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
   };
   ```

## Future Enhancements

Possible features to add:

1. **Filter dives by location/region**
   - Add geospatial queries
   - Find dives within radius

2. **Map view of all dives**
   - Show all dive locations on one map
   - Cluster nearby dives

3. **Popular dive spots**
   - Aggregate dive locations
   - Show top rated locations

4. **Distance calculations**
   - Calculate distance between dives
   - Find nearby dive buddies

5. **Route planning**
   - Use Geoapify routing API
   - Plan dive trips with multiple spots
