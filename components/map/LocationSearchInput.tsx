"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { searchLocation } from "@/lib/geocoding";
import { LocationData, GeocodingResult } from "@/lib/types/location";

interface LocationSearchInputProps {
  onLocationSelect: (location: LocationData) => void;
  className?: string;
  placeholder?: string;
}

/**
 * Location search input with autocomplete using Geoapify geocoding
 */
export default function LocationSearchInput({
  onLocationSelect,
  className = "",
  placeholder = "Search for a location...",
}: LocationSearchInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const searchResults = await searchLocation(searchQuery);
      setResults(searchResults);
      setShowResults(true);
    } catch (err) {
      console.error("Search error:", err);
      setError("Failed to search locations");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleResultClick = (result: GeocodingResult) => {
    const location: LocationData = {
      latitude: result.lat,
      longitude: result.lon,
      name: result.name,
      displayName: result.display_name,
    };

    onLocationSelect(location);
    setQuery(result.name);
    setShowResults(false);
    setResults([]);
  };

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={inputRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {error && (
        <div className="absolute top-full mt-1 w-full bg-red-50 border border-red-200 rounded-lg p-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
          {results.map((result, index) => (
            <button
              key={index}
              onClick={() => handleResultClick(result)}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">{result.name}</div>
              <div className="text-sm text-gray-500 mt-0.5">{result.display_name}</div>
            </button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && query.length >= 2 && !isLoading && (
        <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-sm text-gray-500 text-center">
          No locations found
        </div>
      )}
    </div>
  );
}
