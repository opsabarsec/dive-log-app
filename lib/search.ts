/**
 * Search utilities for finding club websites
 */

export interface SearchResult {
  url: string;
  title: string;
  snippet?: string;
}

/**
 * Search for a club website using DuckDuckGo search
 * Gets the first search result from DuckDuckGo
 */
export async function searchClubWebsite(
  clubName: string
): Promise<SearchResult | null> {
  if (!clubName || clubName.trim().length === 0) {
    return null;
  }

  try {
    // Call our API route which handles DuckDuckGo search
    const query = encodeURIComponent(clubName);
    const response = await fetch(`/api/search-club?q=${query}`);

    if (!response.ok) {
      console.error("Search API error:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.success && data.url) {
      return {
        url: data.url,
        title: clubName,
      };
    }

    console.log("No URL found in search results");
    return null;
  } catch (error) {
    console.error("Error searching for club website:", error);
    return null;
  }
}

/**
 * Validate if a string is a valid URL
 */
export function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Format URL to ensure it has a protocol
 */
export function formatUrl(url: string): string {
  if (!url) return "";

  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  return `https://${trimmed}`;
}
