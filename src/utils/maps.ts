
/**
 * Utility functions for Google Maps integration
 */

// Default API key - can be overridden by user input if needed
let googleMapsApiKey = '';

/**
 * Set the Google Maps API key
 * @param apiKey The Google Maps API key
 */
export const setGoogleMapsApiKey = (apiKey: string): void => {
  googleMapsApiKey = apiKey;
  localStorage.setItem('googleMapsApiKey', apiKey);
};

/**
 * Get the Google Maps API key
 * @returns The Google Maps API key
 */
export const getGoogleMapsApiKey = (): string => {
  // Try to get from memory first
  if (googleMapsApiKey) return googleMapsApiKey;
  
  // Then try to get from localStorage
  const savedKey = localStorage.getItem('googleMapsApiKey');
  if (savedKey) {
    googleMapsApiKey = savedKey;
    return savedKey;
  }
  
  // Return empty if not found
  return '';
};

/**
 * Check if Google Maps API key is set
 * @returns True if the API key is set
 */
export const isGoogleMapsApiKeySet = (): boolean => {
  return !!getGoogleMapsApiKey();
};

/**
 * Calculate estimated travel time between two points
 * @param origin Origin coordinates {lat, lng}
 * @param destination Destination coordinates {lat, lng}
 * @returns Promise resolving to the estimated time in seconds
 */
export const calculateTravelTime = async (
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): Promise<number> => {
  try {
    const apiKey = getGoogleMapsApiKey();
    if (!apiKey) throw new Error('Google Maps API key not set');

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.latitude},${origin.longitude}&destinations=${destination.latitude},${destination.longitude}&mode=driving&key=${apiKey}`;
    
    // In a real implementation, this would be a server-side call to protect the API key
    // For this demo, we'll use our utility function to estimate travel time based on distance
    
    // Fallback to our internal calculation for the demo
    const { calculateDistance, calculateETA } = await import('./distance');
    const distance = calculateDistance(
      origin.latitude, 
      origin.longitude, 
      destination.latitude, 
      destination.longitude
    );
    
    // Convert to seconds (our utility returns minutes)
    return calculateETA(distance) * 60;
  } catch (error) {
    console.error('Error calculating travel time:', error);
    return 0;
  }
};

/**
 * Generate a Google Maps URL for directions
 * @param origin Origin coordinates {lat, lng}
 * @param destination Destination coordinates {lat, lng}
 * @returns Google Maps URL
 */
export const getDirectionsUrl = (
  origin: { latitude: number; longitude: number },
  destination: { latitude: number; longitude: number }
): string => {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&travelmode=driving`;
};
