
/**
 * Calculate distance between two points using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in kilometers
 */
export const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};

/**
 * Convert degrees to radians
 */
const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

/**
 * Calculate ETA based on distance and average speed
 * @param distance Distance in kilometers
 * @param averageSpeed Average speed in km/h
 * @returns ETA in minutes
 */
export const calculateETA = (distance: number, averageSpeed = 40): number => {
  // Average ambulance speed in city is around 40 km/h
  const timeInHours = distance / averageSpeed;
  const timeInMinutes = timeInHours * 60;
  return Math.round(timeInMinutes);
};

/**
 * Format ETA for display
 * @param minutes ETA in minutes
 * @returns Formatted ETA string
 */
export const formatETA = (minutes: number): string => {
  if (minutes < 1) {
    return "Less than a minute";
  } else if (minutes === 1) {
    return "1 minute";
  } else if (minutes < 60) {
    return `${minutes} minutes`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours} hour${hours > 1 ? 's' : ''} ${remainingMinutes > 0 ? `${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}` : ''}`;
  }
};
