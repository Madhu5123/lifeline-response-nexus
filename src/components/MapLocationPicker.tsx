
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { waitForGoogleMapsToLoad, getAddressFromCoordinates } from '@/utils/distance';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize map when component mounts
  useEffect(() => {
    const initMap = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Wait for Google Maps to load
        await waitForGoogleMapsToLoad();
        
        if (!mapRef.current) return;
        
        // Get initial position
        const initialPosition = { lat: 0, lng: 0 };
        
        if (initialLatitude && initialLongitude) {
          initialPosition.lat = initialLatitude;
          initialPosition.lng = initialLongitude;
          initializeMap(initialPosition);
        } else if (navigator.geolocation) {
          // Try to get user's current position
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const currentPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              initializeMap(currentPosition);
            },
            (error) => {
              console.error("Geolocation error:", error);
              setError("Failed to get current location. Using default position.");
              initializeMap(initialPosition);
            }
          );
        } else {
          setError("Geolocation not supported. Using default position.");
          initializeMap(initialPosition);
        }
      } catch (error) {
        console.error("Error initializing map:", error);
        setError("Failed to load Google Maps. Please try again later.");
        setIsLoading(false);
      }
    };
    
    initMap();
  }, [initialLatitude, initialLongitude]);
  
  const initializeMap = (position: google.maps.LatLngLiteral) => {
    if (!mapRef.current || !window.google || !window.google.maps) return;
    
    // Create new map
    const newMap = new window.google.maps.Map(mapRef.current, {
      center: position,
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true
    });
    
    // Create marker
    const newMarker = new window.google.maps.Marker({
      position,
      map: newMap,
      draggable: true,
      animation: window.google.maps.Animation.DROP
    });
    
    // Handle map click
    newMap.addListener('click', (event: any) => {
      if (event.latLng) {
        newMarker.setPosition(event.latLng);
        handleMarkerPosition(event.latLng.lat(), event.latLng.lng());
      }
    });
    
    // Handle marker drag end
    newMarker.addListener('dragend', () => {
      const position = newMarker.getPosition();
      if (position) {
        handleMarkerPosition(position.lat(), position.lng());
      }
    });
    
    // Initial reverse geocoding
    handleMarkerPosition(position.lat, position.lng);
    
    setMap(newMap);
    setMarker(newMarker);
    setIsMapReady(true);
    setIsLoading(false);
  };
  
  // Handle marker position changes
  const handleMarkerPosition = async (lat: number, lng: number) => {
    try {
      const address = await getAddressFromCoordinates(lat, lng);
      onLocationSelect(lat, lng, address);
    } catch (error) {
      console.error("Error getting address:", error);
      onLocationSelect(lat, lng, "Selected Location");
    }
  };
  
  // Handle use current location button click
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation || !map || !marker) return;
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const currentPosition = { lat: latitude, lng: longitude };
        
        map.setCenter(currentPosition);
        marker.setPosition(currentPosition);
        handleMarkerPosition(latitude, longitude);
      },
      (error) => {
        console.error("Error getting current position:", error);
        setError("Failed to get your current location");
      }
    );
  };
  
  return (
    <div className="space-y-2">
      <div 
        ref={mapRef} 
        className="w-full h-[250px] rounded-md border border-gray-300"
      >
        {isLoading && (
          <div className="flex items-center justify-center h-full bg-gray-100 rounded-md">
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
              <p className="mt-2 text-gray-500">Loading map...</p>
            </div>
          </div>
        )}
        
        {error && !isMapReady && (
          <div className="flex items-center justify-center h-full bg-red-50 rounded-md">
            <p className="text-red-500 text-center px-4">{error}</p>
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
          disabled={!isMapReady}
        >
          <MapPin className="h-4 w-4" />
          Use current location
        </Button>
        
        <p className="text-xs text-gray-500">
          Click on the map or drag the marker to set the location
        </p>
      </div>
    </div>
  );
};

export default MapLocationPicker;
