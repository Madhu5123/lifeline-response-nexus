
import { useState, useEffect } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  speed: number | null;
  heading: number | null;
  timestamp: number | null;
  error: string | null;
  loading: boolean;
}

interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  maximumAge?: number;
  timeout?: number;
}

export function useGeolocation(options: GeolocationOptions = {}, updateInterval: number | null = null) {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    speed: null,
    heading: null,
    timestamp: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let watchId: number | null = null;
    let intervalId: number | null = null;

    // Function to get the current position
    const getPosition = () => {
      setState(prev => ({ ...prev, loading: true }));

      if (!navigator.geolocation) {
        setState(prev => ({
          ...prev,
          error: 'Geolocation is not supported by your browser',
          loading: false,
        }));
        return;
      }

      const onSuccess = (position: GeolocationPosition) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
          error: null,
          loading: false,
        });
        
        console.log("Geolocation update:", {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          time: new Date(position.timestamp).toISOString(),
        });
      };

      const onError = (error: GeolocationPositionError) => {
        setState(prev => ({
          ...prev,
          error: error.message,
          loading: false,
        }));
        console.error("Geolocation error:", error.message);
      };

      watchId = navigator.geolocation.watchPosition(onSuccess, onError, options);
    };

    // Initialize position tracking
    getPosition();

    // Set up interval updates if requested
    if (updateInterval !== null) {
      intervalId = window.setInterval(getPosition, updateInterval);
    }

    // Clean up
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [options, updateInterval]);

  return state;
}
