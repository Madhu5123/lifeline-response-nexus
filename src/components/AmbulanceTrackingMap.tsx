import React, { useEffect, useRef, useState } from 'react';
import { Ambulance } from '@/models/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation } from 'lucide-react';

interface AmbulanceTrackingMapProps {
  ambulances: Ambulance[];
  policeLocation?: {
    latitude: number;
    longitude: number;
  };
}

const AmbulanceTrackingMap: React.FC<AmbulanceTrackingMapProps> = ({
  ambulances,
  policeLocation
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const [isLoaded, setIsLoaded] = useState(false);

  // Wait for Google Maps to load
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setIsLoaded(true);
        return;
      }
      setTimeout(checkGoogleMaps, 100);
    };
    checkGoogleMaps();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const defaultCenter = policeLocation ? 
      { lat: policeLocation.latitude, lng: policeLocation.longitude } : 
      { lat: 12.978600, lng: 77.364000 }; // Bangalore coordinates

    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      zoom: 12,
      center: defaultCenter
    });

    // Add police location marker if available
    if (policeLocation) {
      new window.google.maps.Marker({
        position: { lat: policeLocation.latitude, lng: policeLocation.longitude },
        map: mapInstanceRef.current,
        title: 'Your Location (Police)'
      });
    }
  }, [isLoaded, policeLocation]);

  // Update ambulance markers
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    const map = mapInstanceRef.current;
    const currentMarkers = markersRef.current;

    // Remove markers for ambulances no longer in the list
    const currentAmbulanceIds = new Set(ambulances.map(a => a.id));
    currentMarkers.forEach((marker, id) => {
      if (!currentAmbulanceIds.has(id)) {
        marker.setMap(null);
        currentMarkers.delete(id);
      }
    });

    // Add or update markers for current ambulances
    ambulances.forEach(ambulance => {
      if (!ambulance.details.location?.latitude || !ambulance.details.location?.longitude) return;

      const position = {
        lat: ambulance.details.location.latitude,
        lng: ambulance.details.location.longitude
      };

      let marker = currentMarkers.get(ambulance.id);

      if (!marker) {
        // Create custom ambulance icon
        const ambulanceIcon = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <g transform="translate(4, 6)">
                <!-- Ambulance body -->
                <rect x="0" y="8" width="32" height="16" rx="2" fill="#FFFFFF" stroke="#DC2626" stroke-width="2"/>
                <!-- Front windshield -->
                <rect x="0" y="8" width="8" height="8" rx="1" fill="#E5E7EB" stroke="#DC2626" stroke-width="1"/>
                <!-- Back doors -->
                <rect x="24" y="12" width="8" height="8" rx="1" fill="#F3F4F6" stroke="#DC2626" stroke-width="1"/>
                <!-- Red cross -->
                <rect x="12" y="12" width="8" height="2" fill="#DC2626"/>
                <rect x="15" y="9" width="2" height="8" fill="#DC2626"/>
                <!-- Emergency lights -->
                <circle cx="6" cy="6" r="2" fill="#EF4444"/>
                <circle cx="26" cy="6" r="2" fill="#3B82F6"/>
                <!-- Wheels -->
                <circle cx="6" cy="26" r="3" fill="#374151"/>
                <circle cx="26" cy="26" r="3" fill="#374151"/>
                <!-- Wheel rims -->
                <circle cx="6" cy="26" r="1.5" fill="#6B7280"/>
                <circle cx="26" cy="26" r="1.5" fill="#6B7280"/>
              </g>
            </svg>
          `)}`,
          scaledSize: new (window.google.maps as any).Size(40, 40),
          anchor: new (window.google.maps as any).Point(20, 32)
        };

        // Create new marker with ambulance icon
        marker = new (window.google.maps as any).Marker({
          position,
          map,
          icon: ambulanceIcon,
          title: `${ambulance.details.vehicleNumber || 'Unknown'} - ${ambulance.details.driverName || 'Unknown Driver'}`
        }) as google.maps.Marker;

        // Create info window
        const infoWindow = new (window.google.maps as any).InfoWindow({
          content: `
            <div style="padding: 8px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-weight: bold;">${ambulance.details.vehicleNumber || 'Unknown Vehicle'}</h3>
              <p style="margin: 4px 0;"><strong>Driver:</strong> ${ambulance.details.driverName || 'Unknown'}</p>
              <p style="margin: 4px 0;"><strong>Status:</strong> ${ambulance.details.status || 'Unknown'}</p>
              ${ambulance.details.severity ? `<p style="margin: 4px 0;"><strong>Severity:</strong> ${ambulance.details.severity}</p>` : ''}
              ${ambulance.details.destination ? `<p style="margin: 4px 0;"><strong>Destination:</strong> ${ambulance.details.destination.name} (${ambulance.details.destination.eta})</p>` : ''}
              <p style="margin: 4px 0; font-size: 12px; color: #666;">Last updated: ${new Date(ambulance.details.lastUpdated || Date.now()).toLocaleTimeString()}</p>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        currentMarkers.set(ambulance.id, marker);
      } else {
        // Update existing marker position
        marker.setPosition(position);
        (marker as any).setTitle(`${ambulance.details.vehicleNumber || 'Unknown'} - ${ambulance.details.driverName || 'Unknown Driver'}`);
      }
    });

    // Adjust map bounds to show all ambulances and police location
    if (ambulances.length > 0 || policeLocation) {
      const bounds = new (window.google.maps as any).LatLngBounds();
      
      if (policeLocation) {
        bounds.extend({ lat: policeLocation.latitude, lng: policeLocation.longitude });
      }
      
      ambulances.forEach(ambulance => {
        if (ambulance.details.location?.latitude && ambulance.details.location?.longitude) {
          bounds.extend({
            lat: ambulance.details.location.latitude,
            lng: ambulance.details.location.longitude
          });
        }
      });
      
      (map as any).fitBounds(bounds);
      
      // Ensure minimum zoom level
      const listener = (window.google.maps as any).event.addListener(map, 'bounds_changed', () => {
        if ((map as any).getZoom() && (map as any).getZoom() > 15) {
          (map as any).setZoom(15);
        }
        (window.google.maps as any).event.removeListener(listener);
      });
    }
  }, [ambulances, isLoaded]);

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading Google Maps...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Real-time Ambulance Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={mapRef} 
          className="w-full h-96 rounded-b-lg"
          style={{ minHeight: '400px' }}
        />
        
        {ambulances.length > 0 && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <MapPin className="h-3 w-3 mr-1" />
                {ambulances.length} Active Ambulance{ambulances.length !== 1 ? 's' : ''}
              </Badge>
              {policeLocation && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  <MapPin className="h-3 w-3 mr-1" />
                  Your Location
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AmbulanceTrackingMap;