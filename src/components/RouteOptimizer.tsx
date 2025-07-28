import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation, Clock, Route, RefreshCw, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EmergencyCase } from "@/models/types";
import { waitForGoogleMapsToLoad } from "@/utils/distance";

interface RouteOptimizerProps {
  emergencyCase: EmergencyCase;
  currentLocation: {
    latitude: number;
    longitude: number;
  };
  onRouteSelected: (route: OptimizedRoute) => void;
  className?: string;
}

interface OptimizedRoute {
  distance: string;
  duration: string;
  durationInTraffic: string;
  startAddress: string;
  endAddress: string;
  trafficDelay: string;
  instructions: string[];
  googleMapsUrl: string;
}

const RouteOptimizer: React.FC<RouteOptimizerProps> = ({
  emergencyCase,
  currentLocation,
  onRouteSelected,
  className = ""
}) => {
  const [routes, setRoutes] = useState<OptimizedRoute[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const calculateOptimizedRoutes = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      await waitForGoogleMapsToLoad();
      
      if (!window.google || !window.google.maps) {
        throw new Error("Google Maps API not available");
      }

      const directionsService = new window.google.maps.DirectionsService();
      
      // Get hospital location
      const hospitalLocation = emergencyCase.hospital as any;
      if (!hospitalLocation?.location?.latitude || !hospitalLocation?.location?.longitude) {
        throw new Error("Hospital location not available");
      }

      const destination = {
        lat: hospitalLocation.location.latitude,
        lng: hospitalLocation.location.longitude
      };

      const origin = {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude
      };

      // Request multiple route alternatives with traffic
      const request: google.maps.DirectionsRequest = {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(), // For traffic-aware routing
          trafficModel: google.maps.TrafficModel.BEST_GUESS
        },
        provideRouteAlternatives: true, // Get alternative routes
        avoidHighways: false,
        avoidTolls: false
      };

      const response = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsService.route(request, (result, status) => {
          if (status === 'OK' && result) {
            resolve(result);
          } else {
            console.error('Directions API error:', status);
            if (status === 'REQUEST_DENIED') {
              reject(new Error('Directions API access denied. Please enable Directions API for your Google Maps API key.'));
            } else if (status === 'OVER_QUERY_LIMIT') {
              reject(new Error('Google Maps API quota exceeded. Please check your usage limits.'));
            } else {
              reject(new Error(`Directions request failed: ${status}`));
            }
          }
        });
      });

      const optimizedRoutes: OptimizedRoute[] = response.routes.map((route, index) => {
        const leg = route.legs[0];
        const durationNormal = leg.duration?.text || "Unknown";
        const durationTraffic = leg.duration_in_traffic?.text || durationNormal;
        
        // Calculate traffic delay
        const normalSeconds = leg.duration?.value || 0;
        const trafficSeconds = leg.duration_in_traffic?.value || normalSeconds;
        const delaySeconds = trafficSeconds - normalSeconds;
        const delayMinutes = Math.round(delaySeconds / 60);
        
        const trafficDelay = delayMinutes > 0 
          ? `+${delayMinutes} min delay`
          : "No delay";

        // Extract key instructions
        const instructions = route.legs[0].steps
          .slice(0, 5) // First 5 steps
          .map(step => step.instructions.replace(/<[^>]*>/g, '')); // Remove HTML tags

        // Create Google Maps URL
        const googleMapsUrl = `https://www.google.com/maps/dir/${origin.lat},${origin.lng}/${destination.lat},${destination.lng}`;

        return {
          distance: leg.distance?.text || "Unknown",
          duration: durationNormal,
          durationInTraffic: durationTraffic,
          startAddress: leg.start_address || "Current Location",
          endAddress: leg.end_address || "Hospital",
          trafficDelay,
          instructions,
          googleMapsUrl
        };
      });

      // Sort routes by traffic-aware duration
      optimizedRoutes.sort((a, b) => {
        const aDuration = parseInt(a.durationInTraffic) || 0;
        const bDuration = parseInt(b.durationInTraffic) || 0;
        return aDuration - bDuration;
      });

      setRoutes(optimizedRoutes);
      
      if (optimizedRoutes.length > 0) {
        toast({
          title: "Routes Optimized",
          description: `Found ${optimizedRoutes.length} route${optimizedRoutes.length > 1 ? 's' : ''} with traffic data`,
        });
      }
    } catch (err) {
      console.error("Route optimization error:", err);
      setError(err instanceof Error ? err.message : "Failed to calculate routes");
      toast({
        title: "Route Optimization Failed",
        description: "Unable to calculate optimized routes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [emergencyCase, currentLocation, toast]);

  const getTrafficBadgeColor = (trafficDelay: string) => {
    if (trafficDelay === "No delay") return "bg-green-500 text-white";
    if (trafficDelay.includes("+") && parseInt(trafficDelay) <= 5) return "bg-yellow-500 text-white";
    return "bg-red-500 text-white";
  };

  const getRouteBadgeColor = (index: number) => {
    switch (index) {
      case 0: return "bg-green-600 text-white"; // Fastest route
      case 1: return "bg-blue-600 text-white";  // Alternative
      default: return "bg-gray-600 text-white"; // Other routes
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Route className="h-5 w-5" />
          Dynamic Route Optimization
        </h3>
        <Button
          onClick={calculateOptimizedRoutes}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          {loading ? (
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Navigation className="h-4 w-4 mr-2" />
          )}
          {loading ? "Calculating..." : "Optimize Routes"}
        </Button>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {routes.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            {routes.length} route{routes.length > 1 ? 's' : ''} found with real-time traffic data:
          </p>
          
          {routes.map((route, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={getRouteBadgeColor(index)}>
                      {index === 0 ? "Fastest" : `Route ${index + 1}`}
                    </Badge>
                    <Badge className={getTrafficBadgeColor(route.trafficDelay)}>
                      {route.trafficDelay}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">{route.durationInTraffic}</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Distance:</span>
                    <span className="ml-2 font-medium">{route.distance}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Normal Time:</span>
                    <span className="ml-2 font-medium">{route.duration}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm text-gray-500">Key directions:</span>
                  <ul className="text-xs text-gray-600 space-y-1 pl-4">
                    {route.instructions.slice(0, 3).map((instruction, i) => (
                      <li key={i} className="list-disc">
                        {instruction.length > 80 ? `${instruction.substring(0, 80)}...` : instruction}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => onRouteSelected(route)}
                    size="sm"
                    className={index === 0 ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    <Navigation className="h-4 w-4 mr-1" />
                    Select Route
                  </Button>
                  
                  <Button
                    onClick={() => window.open(route.googleMapsUrl, '_blank')}
                    variant="outline"
                    size="sm"
                  >
                    View in Maps
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && routes.length === 0 && !error && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-gray-600">
              Click "Optimize Routes" to get traffic-aware navigation with multiple route options.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RouteOptimizer;