"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { LocationData } from "@/lib/types/location";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { searchClubWebsite } from "@/lib/search";

// Dynamically import LocationPicker to avoid SSR issues
const LocationPicker = dynamic(
  () => import("@/components/map/LocationPicker"),
  { ssr: false }
);

interface DiveFormProps {
  userId: string;
  onSuccess?: (diveId: string) => void;
}

/**
 * Dive logging form with integrated location picker
 * Demonstrates how to use LocationPicker with Convex mutations
 */
export default function DiveForm({ userId, onSuccess }: DiveFormProps) {
  const createDive = useMutation(api.dives.createDive);
  const generateUploadUrl = useMutation(api.dives.generateUploadUrl);
  const autocompleteData = useQuery(api.dives.getAutocompleteData, { userId });

  const [location, setLocation] = useState<LocationData | null>(null);
  const [formData, setFormData] = useState({
    diveNumber: 1,
    diveDate: new Date().toISOString().split("T")[0],
    site: "",
    duration: 45,
    maxDepth: 20,
    temperature: 20,
    waterType: "saltwater",
    visibility: 10,
    weather: "sunny",
    suitThickness: 5,
    leadWeights: 4,
    clubName: "",
    clubWebsite: "",
    instructorName: "",
    notes: "",
  });
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSearchingWebsite, setIsSearchingWebsite] = useState(false);

  // Autocomplete suggestions
  const [showClubSuggestions, setShowClubSuggestions] = useState(false);
  const [showInstructorSuggestions, setShowInstructorSuggestions] = useState(false);
  const clubInputRef = useRef<HTMLInputElement>(null);
  const instructorInputRef = useRef<HTMLInputElement>(null);

  const handleLocationSelect = (selectedLocation: LocationData) => {
    setLocation(selectedLocation);
    console.log("Location selected:", selectedLocation);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image size must be less than 10MB');
        return;
      }
      setSelectedPhoto(file);
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setPhotoPreview(previewUrl);
      setError(null);
    }
  };

  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle club name change - auto-fill website if it exists in autocomplete data
  const handleClubNameChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const clubName = e.target.value;
    setFormData((prev) => ({ ...prev, clubName }));
    setShowClubSuggestions(true);

    // Check if this club exists in autocomplete data and auto-fill website
    if (autocompleteData?.clubWebsites[clubName]) {
      setFormData((prev) => ({
        ...prev,
        clubWebsite: autocompleteData.clubWebsites[clubName],
      }));
    }
  };

  // Search for club website using DuckDuckGo
  const handleSearchClubWebsite = async () => {
    if (!formData.clubName || formData.clubName.trim().length === 0) {
      return;
    }

    setIsSearchingWebsite(true);
    try {
      const result = await searchClubWebsite(formData.clubName);
      if (result && result.url) {
        setFormData((prev) => ({ ...prev, clubWebsite: result.url }));
      }
    } catch (error) {
      console.error("Error searching for club website:", error);
    } finally {
      setIsSearchingWebsite(false);
    }
  };

  // Handle club suggestion selection
  const handleClubSuggestionClick = (clubName: string) => {
    setFormData((prev) => ({
      ...prev,
      clubName,
      clubWebsite: autocompleteData?.clubWebsites[clubName] || ""
    }));
    setShowClubSuggestions(false);
  };

  // Handle instructor suggestion selection
  const handleInstructorSuggestionClick = (instructorName: string) => {
    setFormData((prev) => ({ ...prev, instructorName }));
    setShowInstructorSuggestions(false);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        clubInputRef.current &&
        !clubInputRef.current.contains(event.target as Node)
      ) {
        setShowClubSuggestions(false);
      }
      if (
        instructorInputRef.current &&
        !instructorInputRef.current.contains(event.target as Node)
      ) {
        setShowInstructorSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!location) {
      setError("Please select a dive location on the map");
      return;
    }

    if (!selectedPhoto) {
      setError("Please upload a photo to validate this dive");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Upload the photo to Convex storage
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedPhoto.type },
        body: selectedPhoto,
      });

      if (!uploadResult.ok) {
        throw new Error("Failed to upload photo");
      }

      const { storageId } = await uploadResult.json();

      // Step 2: Create the dive with the photo storage ID
      const diveId = await createDive({
        userId,
        diveNumber: Number(formData.diveNumber),
        diveDate: new Date(formData.diveDate).getTime(),
        location: location.displayName || location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        site: formData.site || undefined,
        duration: Number(formData.duration),
        maxDepth: Number(formData.maxDepth),
        temperature: Number(formData.temperature) || undefined,
        waterType: formData.waterType,
        visibility: Number(formData.visibility) || undefined,
        weather: formData.weather || undefined,
        suitThickness: Number(formData.suitThickness) || undefined,
        leadWeights: Number(formData.leadWeights) || undefined,
        clubName: formData.clubName || undefined,
        clubWebsite: formData.clubWebsite || undefined,
        instructorName: formData.instructorName || undefined,
        notes: formData.notes || undefined,
        photoStorageId: storageId,
        buddyIds: [],
        equipment: [],
      });

      console.log("Dive created successfully:", diveId);

      // Reset form
      setLocation(null);
      handleRemovePhoto();
      setFormData({
        diveNumber: Number(formData.diveNumber) + 1, // Increment for next dive
        diveDate: new Date().toISOString().split("T")[0],
        site: "",
        duration: 45,
        maxDepth: 20,
        temperature: 20,
        waterType: "saltwater",
        visibility: 10,
        weather: "sunny",
        suitThickness: 5,
        leadWeights: 4,
        clubName: "",
        clubWebsite: "",
        instructorName: "",
        notes: "",
      });

      if (onSuccess) {
        onSuccess(diveId as unknown as string);
      }
    } catch (err) {
      console.error("Error creating dive:", err);
      setError(err instanceof Error ? err.message : "Failed to create dive");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-gray-600">
        Fields marked with <span className="text-red-600">*</span> are required
      </p>

      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="diveNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Dive Number <span className="text-red-600">*</span>
            </label>
            <input
              type="number"
              id="diveNumber"
              name="diveNumber"
              value={formData.diveNumber}
              onChange={handleInputChange}
              min="1"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="diveDate" className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-red-600">*</span>
            </label>
            <input
              type="date"
              id="diveDate"
              name="diveDate"
              value={formData.diveDate}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Location Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dive Location</h3>
        <LocationPicker
          onLocationSelect={handleLocationSelect}
          initialLocation={location || undefined}
        />
        {!location && (
          <p className="text-sm text-gray-500 mt-2">
            Click on the map or search to select your dive location
          </p>
        )}
      </div>

      {/* Dive Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Dive Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="site" className="block text-sm font-medium text-gray-700 mb-1">
              Dive Site Name
            </label>
            <input
              type="text"
              id="site"
              name="site"
              value={formData.site}
              onChange={handleInputChange}
              placeholder="e.g., Blue Corner, SS Yongala"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes)
            </label>
            <input
              type="number"
              id="duration"
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              min="1"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="maxDepth" className="block text-sm font-medium text-gray-700 mb-1">
              Max Depth (meters)
            </label>
            <input
              type="number"
              id="maxDepth"
              name="maxDepth"
              value={formData.maxDepth}
              onChange={handleInputChange}
              min="0"
              step="0.1"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">
              Water Temperature (°C)
            </label>
            <input
              type="number"
              id="temperature"
              name="temperature"
              value={formData.temperature}
              onChange={handleInputChange}
              step="0.1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="waterType" className="block text-sm font-medium text-gray-700 mb-1">
              Water Type
            </label>
            <select
              id="waterType"
              name="waterType"
              value={formData.waterType}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="saltwater">Saltwater</option>
              <option value="freshwater">Freshwater</option>
            </select>
          </div>

          <div>
            <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 mb-1">
              Visibility (meters)
            </label>
            <input
              type="number"
              id="visibility"
              name="visibility"
              value={formData.visibility}
              onChange={handleInputChange}
              min="0"
              step="0.5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="weather" className="block text-sm font-medium text-gray-700 mb-1">
              Weather Conditions
            </label>
            <input
              type="text"
              id="weather"
              name="weather"
              value={formData.weather}
              onChange={handleInputChange}
              placeholder="e.g., sunny, cloudy, rainy"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="suitThickness" className="block text-sm font-medium text-gray-700 mb-1">
              (Wet)Suit Thickness (mm)
            </label>
            <input
              type="number"
              id="suitThickness"
              name="suitThickness"
              value={formData.suitThickness}
              onChange={handleInputChange}
              min="0"
              step="0.5"
              placeholder="5"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="leadWeights" className="block text-sm font-medium text-gray-700 mb-1">
              Lead Weights (kg)
            </label>
            <input
              type="number"
              id="leadWeights"
              name="leadWeights"
              value={formData.leadWeights}
              onChange={handleInputChange}
              min="0"
              step="0.5"
              placeholder="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Dive Validation */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Dive Validation
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Club Name with Autocomplete */}
          <div className="relative" ref={clubInputRef}>
            <label
              htmlFor="clubName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Club Name
            </label>
            <input
              type="text"
              id="clubName"
              name="clubName"
              value={formData.clubName}
              onChange={handleClubNameChange}
              onFocus={() => setShowClubSuggestions(true)}
              placeholder="e.g., Blue Water Diving"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {/* Autocomplete Suggestions */}
            {showClubSuggestions &&
              autocompleteData &&
              autocompleteData.clubNames.length > 0 &&
              formData.clubName.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {autocompleteData.clubNames
                    .filter((name) =>
                      name
                        .toLowerCase()
                        .includes(formData.clubName.toLowerCase())
                    )
                    .map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleClubSuggestionClick(name)}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                      >
                        {name}
                      </button>
                    ))}
                </div>
              )}
          </div>

          {/* Club Website */}
          <div>
            <label
              htmlFor="clubWebsite"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Club Website
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                id="clubWebsite"
                name="clubWebsite"
                value={formData.clubWebsite}
                onChange={handleInputChange}
                placeholder="https://example.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleSearchClubWebsite}
                disabled={
                  !formData.clubName || isSearchingWebsite
                }
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  !formData.clubName || isSearchingWebsite
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
                title="Search for club website"
              >
                {isSearchingWebsite ? (
                  <i className="pi pi-spinner pi-spin"></i>
                ) : (
                  <i className="pi pi-search"></i>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Click search to find the club website automatically
            </p>
          </div>

          {/* Instructor/Buddy Name with Autocomplete */}
          <div className="relative" ref={instructorInputRef}>
            <label
              htmlFor="instructorName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Instructor or Buddy Name
            </label>
            <input
              type="text"
              id="instructorName"
              name="instructorName"
              value={formData.instructorName}
              onChange={handleInputChange}
              onFocus={() => setShowInstructorSuggestions(true)}
              placeholder="e.g., John Smith"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {/* Autocomplete Suggestions */}
            {showInstructorSuggestions &&
              autocompleteData &&
              autocompleteData.instructorNames.length > 0 &&
              formData.instructorName.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {autocompleteData.instructorNames
                    .filter((name) =>
                      name
                        .toLowerCase()
                        .includes(formData.instructorName.toLowerCase())
                    )
                    .map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => handleInstructorSuggestionClick(name)}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                      >
                        {name}
                      </button>
                    ))}
                </div>
              )}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          rows={4}
          placeholder="Add any additional notes about this dive..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Photo Upload - Validation Field */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Dive Validation Photo <span className="text-red-600">*</span>
        </h3>
        <p className="text-sm text-blue-800 mb-4">
          To validate this dive, please upload a related photo (e.g., underwater scene, dive site, dive buddy, or equipment)
        </p>

        {!selectedPhoto ? (
          <div>
            <label
              htmlFor="photoUpload"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-blue-50 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg
                  className="w-12 h-12 mb-3 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mb-2 text-sm text-blue-700 font-semibold">
                  Click to upload dive photo
                </p>
                <p className="text-xs text-blue-600">
                  PNG, JPG, or JPEG (MAX. 10MB)
                </p>
              </div>
              <input
                id="photoUpload"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border-2 border-blue-300">
              <img
                src={photoPreview || ""}
                alt="Dive photo preview"
                className="w-full h-64 object-cover"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-colors shadow-lg"
                title="Remove photo"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  {selectedPhoto.name}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {(selectedPhoto.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !location || !selectedPhoto}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            isSubmitting || !location || !selectedPhoto
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {isSubmitting ? "Saving..." : "Log Dive"}
        </button>
      </div>
    </form>
  );
}
