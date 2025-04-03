
import { useState, useEffect } from 'react';

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  timestamp: number | null;
}

export const useGeolocation = (options?: PositionOptions, interval = 0) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    timestamp: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by your browser',
      }));
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        error: null,
        timestamp: position.timestamp,
      });
    };

    const onError = (error: GeolocationPositionError) => {
      setState(prev => ({
        ...prev,
        error: error.message,
      }));
    };

    // Get initial position
    navigator.geolocation.getCurrentPosition(onSuccess, onError, options);

    // Set up interval if specified
    let watchId: number | undefined;
    
    if (interval > 0) {
      // Use watchPosition for continuous updates
      watchId = navigator.geolocation.watchPosition(onSuccess, onError, options);
    }

    // Clean up
    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [options, interval]);

  return state;
};
