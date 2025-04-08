
/**
 * Calculates the distance between two coordinates using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Earth's approximate radius in km
  const R = 6371;
  
  // Convert latitude and longitude from degrees to radians
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * Converts degrees to radians
 * @param deg Degrees to convert
 * @returns Value in radians
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculates estimated time of arrival based on distance
 * @param distance Distance in kilometers
 * @param avgSpeed Average speed in km/h (default: 50)
 * @returns ETA in minutes
 */
export function calculateETA(distance: number, avgSpeed: number = 50): number {
  // Calculate time in hours
  const timeHours = distance / avgSpeed;
  
  // Convert time to minutes
  const timeMinutes = timeHours * 60;
  
  return Math.round(timeMinutes);
}

/**
 * Geocode an address string to get latitude and longitude
 * @param address The address to geocode
 * @returns Promise resolving to latitude and longitude
 */
export function geocodeAddress(address: string): Promise<{lat: number, lng: number}> {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.maps) {
      reject(new Error("Google Maps API not loaded"));
      return;
    }
    
    const geocoder = new window.google.maps.Geocoder();
    
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        const location = results[0].geometry.location;
        resolve({
          lat: location.lat(),
          lng: location.lng()
        });
      } else {
        reject(new Error(`Geocoding failed: ${status}`));
      }
    });
  });
}

/**
 * Calculate ETA from address (using geocoding)
 * @param address Text address
 * @param destLat Destination latitude
 * @param destLng Destination longitude
 * @returns Promise resolving to estimated minutes
 */
export async function calculateETAFromAddress(
  address: string, 
  destLat?: number, 
  destLng?: number
): Promise<number> {
  try {
    if (!address) {
      return Math.floor(Math.random() * (30 - 5 + 1)) + 5; // Fallback to random ETA
    }
    
    const coords = await geocodeAddress(address);
    
    if (destLat && destLng) {
      const distance = calculateDistance(coords.lat, coords.lng, destLat, destLng);
      return calculateETA(distance);
    }
    
    // Fallback if destination coordinates not provided
    return Math.floor(Math.random() * (30 - 5 + 1)) + 5;
  } catch (error) {
    console.error("Error calculating ETA from address:", error);
    return Math.floor(Math.random() * (30 - 5 + 1)) + 5; // Fallback to random ETA
  }
}

/**
 * Get address from coordinates (reverse geocoding)
 * @param lat Latitude
 * @param lng Longitude
 * @returns Promise resolving to address string
 */
export function getAddressFromCoordinates(lat: number, lng: number): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.maps) {
      reject(new Error("Google Maps API not loaded"));
      return;
    }
    
    const geocoder = new window.google.maps.Geocoder();
    const location = { lat, lng };
    
    geocoder.geocode({ location }, (results, status) => {
      if (status === "OK" && results && results[0]) {
        resolve(results[0].formatted_address);
      } else {
        reject(new Error(`Reverse geocoding failed: ${status}`));
      }
    });
  });
}

/**
 * Format ETA for display
 * @param minutes ETA in minutes
 * @returns Formatted ETA string
 */
export function formatETA(minutes: number): string {
  if (minutes < 1) {
    return "Less than a minute";
  }
  
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
}

/**
 * Create a deep link to Google Maps for navigation
 * @param lat Destination latitude
 * @param lng Destination longitude
 * @param label Optional destination label
 * @returns Google Maps URL
 */
export function createGoogleMapsLink(lat: number, lng: number, label?: string): string {
  if (label) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(label)}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/**
 * Create a Google Maps link from an address string
 * @param address The address to navigate to
 * @returns Google Maps URL
 */
export function createGoogleMapsLinkFromAddress(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}

/**
 * Checks if Google Maps API is loaded
 * @returns Boolean indicating if Google Maps API is available
 */
export function isGoogleMapsLoaded(): boolean {
  return !!(window.google && window.google.maps);
}

/**
 * Waits for Google Maps API to load
 * @param timeout Optional timeout in milliseconds
 * @returns Promise that resolves when API is loaded
 */
export function waitForGoogleMapsToLoad(timeout: number = 10000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.googleMapsLoaded || (window.google && window.google.maps)) {
      resolve();
      return;
    }
    
    const timeoutId = setTimeout(() => {
      window.removeEventListener('google-maps-loaded', handleLoaded);
      reject(new Error('Google Maps API failed to load'));
    }, timeout);
    
    const handleLoaded = () => {
      clearTimeout(timeoutId);
      window.removeEventListener('google-maps-loaded', handleLoaded);
      resolve();
    };
    
    window.addEventListener('google-maps-loaded', handleLoaded);
  });
}
