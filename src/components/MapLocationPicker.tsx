
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Explicitly define types for Google Maps to help TypeScript recognize them
type GoogleMap = google.maps.Map;
type GoogleMarker = google.maps.Marker;
type LatLngLiteral = google.maps.LatLngLiteral;

interface MapLocationPickerProps {
  onLocationSelect: (latitude: number, longitude: number, address: string) => void;
  initialLatitude?: number | null;
  initialLongitude?: number | null;
}

const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  onLocationSelect,
  initialLatitude,
  initialLongitude
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<GoogleMap | null>(null);
  const [marker, setMarker] = useState<GoogleMarker | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    console.log("Checking Google Maps API...");
    
    const scriptElement = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    const apiKeySet = scriptElement?.getAttribute('src')?.includes('key=AIzaSyCn9PtxnG4vnNEy_-azKJoWCz5nYVxF3IY');
    
    console.log("API Key set:", apiKeySet);
    
    if (!apiKeySet) {
      console.error("Google Maps API key is not properly configured in index.html");
      toast({
        title: "Map Error",
        description: "Google Maps API key is not configured. Contact the administrator.",
        variant: "destructive",
      });
    }

    if (window.google && window.google.maps) {
      console.log("Google Maps API already loaded");
      setIsGoogleMapsLoaded(true);
      return;
    }
    
    const handleGoogleMapsLoaded = () => {
      console.log("Google Maps API loaded event received");
      setIsGoogleMapsLoaded(true);
    };
    
    window.addEventListener('google-maps-loaded', handleGoogleMapsLoaded);
    
    return () => {
      window.removeEventListener('google-maps-loaded', handleGoogleMapsLoaded);
    };
  }, [toast]);
  
  useEffect(() => {
    if (isGoogleMapsLoaded && mapRef.current && !map) {
      console.log("Initializing map with Google Maps API");
      
      const initialPosition: LatLngLiteral = {
        lat: initialLatitude ?? 0,
        lng: initialLongitude ?? 0
      };
      
      if (!initialLatitude || !initialLongitude) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log("Got current position:", position.coords);
              const currentPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              initializeMap(currentPosition);
            },
            (error) => {
              console.error("Geolocation error:", error);
              initializeMap(initialPosition);
            }
          );
        } else {
          initializeMap(initialPosition);
        }
      } else {
        initializeMap(initialPosition);
      }
    }
  }, [initialLatitude, initialLongitude, map, isGoogleMapsLoaded]);
  
  const initializeMap = (position: LatLngLiteral) => {
    if (!mapRef.current || !window.google || !window.google.maps) {
      console.error("Google Maps API not loaded or map ref not available");
      return;
    }
    
    try {
      console.log("Creating new Google Map with position:", position);
      const newMap = new window.google.maps.Map(mapRef.current, {
        center: position,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true
      });
      
      const newMarker = new window.google.maps.Marker({
        position,
        map: newMap,
        draggable: true,
        animation: window.google.maps.Animation.DROP
      });
      
      newMap.addListener('click', (event: any) => {
        if (event.latLng) {
          console.log("Map clicked at:", event.latLng.lat(), event.latLng.lng());
          newMarker.setPosition(event.latLng);
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: event.latLng }, (results: any, status: string) => {
            if (status === 'OK' && results?.[0]) {
              const address = results[0].formatted_address;
              console.log("Geocoded address:", address);
              if (event.latLng) {
                onLocationSelect(event.latLng.lat(), event.latLng.lng(), address);
              }
            }
          });
        }
      });
      
      newMarker.addListener('dragend', () => {
        const position = newMarker.getPosition();
        if (position) {
          console.log("Marker dragged to:", position.lat(), position.lng());
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: position }, (results: any, status: string) => {
            if (status === 'OK' && results?.[0]) {
              const address = results[0].formatted_address;
              console.log("Geocoded address after drag:", address);
              onLocationSelect(position.lat(), position.lng(), address);
            }
          });
        }
      });
      
      setMap(newMap);
      setMarker(newMarker);
      setIsMapReady(true);
      console.log("Map initialization complete");
    } catch (error) {
      console.error("Error initializing Google Maps:", error);
      toast({
        title: "Map Error",
        description: "Failed to initialize the map. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleUseCurrentLocation = () => {
    if (navigator.geolocation && map && marker) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          
          map.setCenter(currentPosition);
          marker.setPosition(currentPosition);
          
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: currentPosition }, (results: any, status: string) => {
            if (status === 'OK' && results?.[0]) {
              const address = results[0].formatted_address;
              onLocationSelect(currentPosition.lat, currentPosition.lng, address);
            } else {
              onLocationSelect(currentPosition.lat, currentPosition.lng, "Selected Location");
            }
          });
        },
        (error) => {
          console.error("Error getting current position:", error);
          toast({
            title: "Location Error",
            description: "Unable to get your current location. Please enable location services.",
            variant: "destructive",
          });
        }
      );
    }
  };
  
  return (
    <div className="space-y-2">
      <div 
        ref={mapRef} 
        className="w-full h-[250px] rounded-md border border-gray-300"
      >
        {!isMapReady && (
          <div className="flex items-center justify-center h-full bg-gray-100 rounded-md">
            <p className="text-gray-500">Loading map...</p>
          </div>
        )}
      </div>
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseCurrentLocation}
          className="flex items-center gap-1"
        >
          <MapPin className="h-4 w-4" />
          Use current location
        </Button>
        <p className="text-xs text-gray-500">
          Click on the map or drag the marker to set the emergency location
        </p>
      </div>
    </div>
  );
};

export default MapLocationPicker;
