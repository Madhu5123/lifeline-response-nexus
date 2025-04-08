
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, ArrowRight } from "lucide-react";
import { 
  geocodeAddress, 
  calculateETAFromAddress, 
  formatETA, 
  createGoogleMapsLinkFromAddress 
} from "@/utils/distance";

interface AddressLookupProps {
  onAddressSelect: (address: string, latitude?: number, longitude?: number) => void;
  initialAddress?: string;
  destinationCoordinates?: { lat: number, lng: number };
  showEta?: boolean;
  className?: string;
}

const AddressLookup: React.FC<AddressLookupProps> = ({
  onAddressSelect,
  initialAddress = "",
  destinationCoordinates,
  showEta = false,
  className = ""
}) => {
  const [address, setAddress] = useState(initialAddress);
  const [coordinates, setCoordinates] = useState<{ lat: number, lng: number } | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAddress && initialAddress !== address) {
      setAddress(initialAddress);
    }
  }, [initialAddress]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
    setError(null);
  };

  const handleUseCurrentLocation = () => {
    setIsLoading(true);
    setError(null);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            
            // Import dynamically to avoid issues if Google Maps isn't loaded
            const { getAddressFromCoordinates } = await import("@/utils/distance");
            
            const addressFromCoords = await getAddressFromCoordinates(latitude, longitude);
            setAddress(addressFromCoords);
            setCoordinates({ lat: latitude, lng: longitude });
            
            onAddressSelect(addressFromCoords, latitude, longitude);
            
            // Calculate ETA if needed
            if (showEta && destinationCoordinates) {
              calculateAndSetEta(addressFromCoords);
            }
            
            setIsLoading(false);
          } catch (error) {
            console.error("Error getting address from coordinates:", error);
            setError("Failed to get your current location address");
            setIsLoading(false);
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          setError("Failed to get your current location");
          setIsLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser");
      setIsLoading(false);
    }
  };

  const handleAddressLookup = async () => {
    if (!address.trim()) {
      setError("Please enter an address");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const coords = await geocodeAddress(address);
      setCoordinates(coords);
      onAddressSelect(address, coords.lat, coords.lng);
      
      // Calculate ETA if needed
      if (showEta && destinationCoordinates) {
        await calculateAndSetEta(address);
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      setError("Failed to find this address");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAndSetEta = async (addressToUse: string) => {
    if (!destinationCoordinates) return;
    
    try {
      const etaMinutes = await calculateETAFromAddress(
        addressToUse,
        destinationCoordinates.lat,
        destinationCoordinates.lng
      );
      setEta(formatETA(etaMinutes));
    } catch (error) {
      console.error("ETA calculation error:", error);
      setEta("Unable to calculate ETA");
    }
  };

  const openInGoogleMaps = () => {
    if (address) {
      window.open(createGoogleMapsLinkFromAddress(address), "_blank");
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          placeholder="Enter address"
          value={address}
          onChange={handleAddressChange}
          className="flex-grow"
        />
        <Button 
          type="button" 
          onClick={handleAddressLookup}
          disabled={isLoading || !address.trim()}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-b-transparent"></span>
              Loading...
            </span>
          ) : "Confirm Address"}
        </Button>
      </div>
      
      <div className="flex justify-between items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseCurrentLocation}
          disabled={isLoading}
          className="flex items-center gap-1 text-xs"
        >
          <MapPin className="h-3 w-3" />
          Use current location
        </Button>
        
        {address && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={openInGoogleMaps}
            className="flex items-center gap-1 text-xs text-blue-600"
          >
            View in Maps
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </div>
      
      {error && <p className="text-sm text-red-500">{error}</p>}
      
      {showEta && eta && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <p className="text-sm text-blue-600 dark:text-blue-400">
            Estimated arrival time: <span className="font-medium">{eta}</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default AddressLookup;
