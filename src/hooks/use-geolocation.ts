
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
  isSupported: boolean;
  permissionDenied: boolean;
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
    isSupported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
    permissionDenied: false,
  });

  useEffect(() => {
    let watchId: number | null = null;
    let intervalId: number | null = null;

    // Default options for mobile devices
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 30000, // 30 seconds
      maximumAge: 300000, // 5 minutes
      ...options
    };

    // Function to get the current position
    const getPosition = () => {
      if (!state.isSupported) {
        setState(prev => ({
          ...prev,
          error: 'Geolocation is not supported by your browser',
          loading: false,
        }));
        return;
      }

      // Don't set loading to true if we already have a position
      setState(prev => ({ 
        ...prev, 
        loading: prev.latitude === null,
        error: null 
      }));

      const onSuccess = (position: GeolocationPosition) => {
        console.log("Geolocation success:", {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString(),
        });

        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
          error: null,
          loading: false,
          isSupported: true,
          permissionDenied: false,
        });
      };

      const onError = (error: GeolocationPositionError) => {
        console.error("Geolocation error:", {
          code: error.code,
          message: error.message,
        });

        let errorMessage = "Unable to get your location";
        let permissionDenied = false;

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location services and refresh the page.";
            permissionDenied = true;
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable. Please check your GPS settings.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
          default:
            errorMessage = error.message || "Unknown location error";
        }

        setState(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
          permissionDenied,
        }));
      };

      // Try to get current position first
      navigator.geolocation.getCurrentPosition(onSuccess, onError, defaultOptions);

      // Set up continuous watching if needed
      if (updateInterval !== null || !watchId) {
        if (watchId) {
          navigator.geolocation.clearWatch(watchId);
        }
        watchId = navigator.geolocation.watchPosition(onSuccess, onError, defaultOptions);
      }
    };

    // Initialize position tracking
    getPosition();

    // Set up interval updates if requested
    if (updateInterval !== null && updateInterval > 0) {
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
  }, [options.enableHighAccuracy, options.maximumAge, options.timeout, updateInterval, state.isSupported]);

  // Function to manually retry getting location
  const retryLocation = () => {
    setState(prev => ({ ...prev, loading: true, error: null, permissionDenied: false }));
  };

  return { ...state, retryLocation };
}
