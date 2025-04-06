
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [marker, setMarker] = useState<google.maps.Marker | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
  const { toast } = useToast();
  
  // Check if Google Maps API is loaded
  useEffect(() => {
    // Check if the API key is set
    const scriptElement = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    const apiKeySet = scriptElement?.getAttribute('src')?.includes('key=YOUR_API_KEY_HERE') === false;
    
    if (!apiKeySet) {
      console.error("Google Maps API key is not set. Please replace YOUR_API_KEY_HERE with a valid API key in index.html");
      toast({
        title: "Map Error",
        description: "Google Maps API key is not configured. Contact the administrator.",
        variant: "destructive",
      });
    }

    // If Google Maps is already loaded when the component mounts
    if (window.google && window.google.maps) {
      setIsGoogleMapsLoaded(true);
      return;
    }
    
    // If not, listen for the custom event
    const handleGoogleMapsLoaded = () => {
      setIsGoogleMapsLoaded(true);
    };
    
    window.addEventListener('google-maps-loaded', handleGoogleMapsLoaded);
    
    return () => {
      window.removeEventListener('google-maps-loaded', handleGoogleMapsLoaded);
    };
  }, [toast]);
  
  useEffect(() => {
    // Wait until Google Maps is loaded and map ref is available
    if (isGoogleMapsLoaded && mapRef.current && !map) {
      // Initialize the map
      const initialPosition = {
        lat: initialLatitude || 0,
        lng: initialLongitude || 0
      };
      
      // If no initial position, try to get current position
      if (!initialLatitude || !initialLongitude) {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const currentPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              initializeMap(currentPosition);
            },
            () => {
              // Fallback to a default position if geolocation is not available
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
  
  const initializeMap = (position: google.maps.LatLngLiteral) => {
    if (!mapRef.current || !window.google || !window.google.maps) {
      console.error("Google Maps API not loaded");
      return;
    }
    
    try {
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
      
      // Add click event to the map
      newMap.addListener('click', (event: any) => {
        if (event.latLng) {
          newMarker.setPosition(event.latLng);
          // Get address from coordinates
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: event.latLng }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
              const address = results[0].formatted_address;
              if (event.latLng) {
                onLocationSelect(event.latLng.lat(), event.latLng.lng(), address);
              }
            }
          });
        }
      });
      
      // Add dragend event to the marker
      newMarker.addListener('dragend', () => {
        const position = newMarker.getPosition();
        if (position) {
          // Get address from coordinates
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: position }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
              const address = results[0].formatted_address;
              onLocationSelect(position.lat(), position.lng(), address);
            }
          });
        }
      });
      
      setMap(newMap);
      setMarker(newMarker);
      setIsMapReady(true);
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
          
          // Get address from coordinates
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: currentPosition }, (results, status) => {
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
