import { useEffect, useRef, useCallback } from 'react';
import { ref, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import { useGeolocation } from '@/hooks/use-geolocation';

interface LocationTrackingOptions {
  userId: string;
  isTracking: boolean;
  intervalMs?: number;
}

export const useRealTimeLocationTracking = ({
  userId,
  isTracking,
  intervalMs = 10000, // 10 seconds
}: LocationTrackingOptions) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const location = useGeolocation({ 
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 5000
  }, 5000);

  const updateLocationInFirebase = useCallback(async () => {
    if (!location.latitude || !location.longitude || !userId) return;

    try {
      // Reverse geocoding to get address
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.latitude}&lon=${location.longitude}`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "ambulance-app/1.0 (lifelineasai@gmail.com)"
          },
        }
      );
      const data = await res.json();
      const resolvedAddress = data.display_name || "Unknown Location";

      const ambulanceRef = ref(db, `ambulances/${userId}`);
      await update(ambulanceRef, {
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          lastUpdated: new Date().toISOString(),
          address: resolvedAddress
        },
        lastUpdated: new Date().toISOString()
      });

      console.log(`Location updated for ambulance ${userId}:`, {
        lat: location.latitude,
        lng: location.longitude,
        address: resolvedAddress
      });
    } catch (error) {
      console.error("Error updating location:", error);
      
      // Fallback without address
      try {
        const ambulanceRef = ref(db, `ambulances/${userId}`);
        await update(ambulanceRef, {
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            lastUpdated: new Date().toISOString(),
            address: "Location Update"
          },
          lastUpdated: new Date().toISOString()
        });
      } catch (fallbackError) {
        console.error("Fallback location update failed:", fallbackError);
      }
    }
  }, [location.latitude, location.longitude, userId]);

  const startTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Update immediately
    updateLocationInFirebase();

    // Then update every intervalMs
    intervalRef.current = setInterval(() => {
      updateLocationInFirebase();
    }, intervalMs);

    console.log(`Started location tracking for ambulance ${userId} every ${intervalMs}ms`);
  }, [updateLocationInFirebase, intervalMs, userId]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log(`Stopped location tracking for ambulance ${userId}`);
    }
  }, [userId]);

  useEffect(() => {
    if (isTracking && location.latitude && location.longitude) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isTracking, location.latitude, location.longitude, startTracking, stopTracking]);

  return {
    isLocationAvailable: Boolean(location.latitude && location.longitude && !location.error),
    location,
    startTracking,
    stopTracking
  };
};