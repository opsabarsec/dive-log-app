import { GeocodingResult } from "./types/location";

const GEOAPIFY_API_KEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
const GEOCODING_API_URL = "https://api.geoapify.com/v1/geocode";

/**
 * Search for locations using Geoapify Geocoding API
 */
export async function searchLocation(query: string): Promise<GeocodingResult[]> {
  if (!GEOAPIFY_API_KEY) {
    throw new Error("Geoapify API key not configured");
  }

  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const response = await fetch(
      `${GEOCODING_API_URL}/autocomplete?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_API_KEY}&limit=5`
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.statusText}`);
    }

    const data = await response.json();

    return (data.features || []).map((feature: any) => ({
      lat: feature.properties.lat,
      lon: feature.properties.lon,
      name: feature.properties.name || feature.properties.formatted,
      display_name: feature.properties.formatted,
      address: {
        city: feature.properties.city,
        country: feature.properties.country,
        state: feature.properties.state,
      },
    }));
  } catch (error) {
    console.error("Error searching location:", error);
    throw error;
  }
}

/**
 * Reverse geocode coordinates to get location name
 */
export async function reverseGeocode(
  lat: number,
  lon: number
): Promise<GeocodingResult | null> {
  if (!GEOAPIFY_API_KEY) {
    throw new Error("Geoapify API key not configured");
  }

  try {
    const response = await fetch(
      `${GEOCODING_API_URL}/reverse?lat=${lat}&lon=${lon}&apiKey=${GEOAPIFY_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding API error: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const feature = data.features[0];
    return {
      lat: feature.properties.lat,
      lon: feature.properties.lon,
      name: feature.properties.name || feature.properties.formatted,
      display_name: feature.properties.formatted,
      address: {
        city: feature.properties.city,
        country: feature.properties.country,
        state: feature.properties.state,
      },
    };
  } catch (error) {
    console.error("Error reverse geocoding:", error);
    throw error;
  }
}
