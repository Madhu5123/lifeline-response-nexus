
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
