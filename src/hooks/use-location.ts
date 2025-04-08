
import { useState, useEffect, useCallback } from 'react';
import { 
  geocodeAddress, 
  getAddressFromCoordinates, 
  waitForGoogleMapsToLoad,
  isGoogleMapsLoaded
} from '@/utils/distance';

interface LocationHookResult {
  address: string;
  latitude: number | null;
  longitude: number | null;
  isLoading: boolean;
  error: string | null;
  setAddress: (address: string) => void;
  setCoordinates: (lat: number, lng: number) => void;
  useCurrentLocation: () => Promise<void>;
  isGoogleMapsReady: boolean;
}

export function useLocation(
  initialAddress: string = '',
  initialLatitude: number | null = null,
  initialLongitude: number | null = null
): LocationHookResult {
  const [address, setAddressState] = useState(initialAddress);
  const [latitude, setLatitude] = useState<number | null>(initialLatitude);
  const [longitude, setLongitude] = useState<number | null>(initialLongitude);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleMapsReady, setIsGoogleMapsReady] = useState(isGoogleMapsLoaded());

  // Check if Google Maps API is loaded
  useEffect(() => {
    if (isGoogleMapsReady) return;
    
    const checkGoogleMaps = async () => {
      try {
        await waitForGoogleMapsToLoad();
        setIsGoogleMapsReady(true);
      } catch (error) {
        console.error("Google Maps failed to load:", error);
        setError("Google Maps API failed to load. Some location features may not work.");
      }
    };
    
    checkGoogleMaps();
  }, [isGoogleMapsReady]);

  // Set address from coordinates
  useEffect(() => {
    const updateAddressFromCoordinates = async () => {
      if (!latitude || !longitude || !isGoogleMapsReady) return;
      
      setIsLoading(true);
      try {
        const newAddress = await getAddressFromCoordinates(latitude, longitude);
        setAddressState(newAddress);
      } catch (error) {
        console.error("Error getting address from coordinates:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Only run if we have coordinates but no address
    if (latitude && longitude && !address && isGoogleMapsReady) {
      updateAddressFromCoordinates();
    }
  }, [latitude, longitude, address, isGoogleMapsReady]);

  // Set address with geocoding
  const setAddress = useCallback(async (newAddress: string) => {
    setAddressState(newAddress);
    
    if (!newAddress || !isGoogleMapsReady) {
      setLatitude(null);
      setLongitude(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const coords = await geocodeAddress(newAddress);
      setLatitude(coords.lat);
      setLongitude(coords.lng);
    } catch (error) {
      console.error("Error geocoding address:", error);
      setError("Failed to find coordinates for this address");
    } finally {
      setIsLoading(false);
    }
  }, [isGoogleMapsReady]);

  // Set coordinates directly
  const setCoordinates = useCallback(async (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    
    if (!isGoogleMapsReady) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const newAddress = await getAddressFromCoordinates(lat, lng);
      setAddressState(newAddress);
    } catch (error) {
      console.error("Error getting address from coordinates:", error);
      setError("Failed to find address for these coordinates");
    } finally {
      setIsLoading(false);
    }
  }, [isGoogleMapsReady]);

  // Use current location
  const useCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      
      const { latitude, longitude } = position.coords;
      setLatitude(latitude);
      setLongitude(longitude);
      
      if (isGoogleMapsReady) {
        const newAddress = await getAddressFromCoordinates(latitude, longitude);
        setAddressState(newAddress);
      }
    } catch (error) {
      console.error("Error getting current location:", error);
      setError("Failed to get your current location");
    } finally {
      setIsLoading(false);
    }
  }, [isGoogleMapsReady]);

  return {
    address,
    latitude,
    longitude,
    isLoading,
    error,
    setAddress,
    setCoordinates,
    useCurrentLocation,
    isGoogleMapsReady
  };
}
