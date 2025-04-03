import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, MapPin, Phone } from "lucide-react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Ambulance } from "@/models/types";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/use-geolocation";
import { calculateDistance } from "@/utils/distance";
import GoogleMapsApiKeyInput from "@/components/GoogleMapsApiKeyInput";
import { isGoogleMapsApiKeySet, getGoogleMapsApiKey } from "@/utils/maps";

const NEARBY_THRESHOLD = 5;

const PoliceDashboard: React.FC = () => {
  const [ambulances, setAmbulances] = useState<Ambulance[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const { user } = useAuth();
  
  const policeLocation = useGeolocation({ enableHighAccuracy: true }, 10000);
  
  useEffect(() => {
    setApiKeyConfigured(isGoogleMapsApiKeySet());
  }, []);

  useEffect(() => {
    const fetchAmbulances = () => {
      try {
        const ambulancesRef = collection(db, "ambulances");
        
        const unsubscribe = onSnapshot(ambulancesRef, (snapshot) => {
          const ambulancesData: Ambulance[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            
            if (data.location && data.location.latitude && data.location.longitude) {
              let isNearby = false;
              
              if (policeLocation.latitude && policeLocation.longitude) {
                const distance = calculateDistance(
                  policeLocation.latitude,
                  policeLocation.longitude,
                  data.location.latitude,
                  data.location.longitude
                );
                isNearby = distance <= NEARBY_THRESHOLD;
              } else {
                isNearby = Math.random() > 0.7;
              }
              
              ambulancesData.push({
                id: data.id,
                driverName: data.driverName,
                vehicleNumber: data.vehicleNumber,
                severity: data.severity,
                status: data.status,
                location: data.location,
                destination: data.destination,
                caseId: data.caseId,
                isNearby,
                lastUpdated: data.lastUpdated?.toDate() || new Date(),
                distance: policeLocation.latitude && policeLocation.longitude ? 
                  calculateDistance(
                    policeLocation.latitude,
                    policeLocation.longitude,
                    data.location.latitude,
                    data.location.longitude
                  ).toFixed(1) + " km" : 
                  "Unknown",
              } as Ambulance);
            }
          });
          
          setAmbulances(ambulancesData);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching ambulances:", error);
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error("Error setting up ambulances listener:", error);
        setLoading(false);
      }
    };
    
    fetchAmbulances();
  }, [policeLocation.latitude, policeLocation.longitude]);
  
  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case "en-route": return "bg-purple-500 text-white";
      case "idle": return "bg-gray-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };
  
  const getSeverityBadgeClass = (severity: string) => {
    switch(severity) {
      case "critical": return "bg-red-500 text-white";
      case "serious": return "bg-orange-500 text-white";
      case "stable": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };
  
  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.round(diffMs / 1000);
    
    if (diffSecs < 60) {
      return `${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`;
    } else if (diffSecs < 3600) {
      const diffMins = Math.round(diffSecs / 60);
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else {
      const diffHours = Math.round(diffSecs / 3600);
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
  };

  const handleApiKeySet = () => {
    setApiKeyConfigured(true);
  };

  const renderGoogleMap = () => {
    if (!apiKeyConfigured) {
      return (
        <GoogleMapsApiKeyInput onKeySet={handleApiKeySet} />
      );
    }

    return (
      <div className="bg-gray-100 border rounded-md p-4 text-center">
        <p>Google Maps would be displayed here using the API key:</p>
        <p className="text-xs text-gray-500 mt-2 break-all">
          {getGoogleMapsApiKey().substring(0, 8)}...{getGoogleMapsApiKey().substring(getGoogleMapsApiKey().length - 4)}
        </p>
        <p className="text-sm mt-4">
          Ambulances would be shown as markers on the map with their real-time locations
        </p>
        {policeLocation.latitude && policeLocation.longitude && (
          <p className="text-xs mt-2 text-green-600">
            Your position: {policeLocation.latitude.toFixed(6)}, {policeLocation.longitude.toFixed(6)}
          </p>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout title="Police Dashboard" role="police">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">
                {ambulances.filter(a => a.status === "en-route").length}
              </CardTitle>
              <CardDescription>Active Ambulances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-purple-500 text-sm">Currently en route</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">
                {ambulances.filter(a => a.isNearby).length}
              </CardTitle>
              <CardDescription>Nearby Ambulances</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-blue-500 text-sm">Within {NEARBY_THRESHOLD} km of your location</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">
                {ambulances.filter(a => a.severity === "critical").length}
              </CardTitle>
              <CardDescription>Critical Cases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-red-500 text-sm">Highest priority</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">
                {ambulances.filter(a => a.status === "idle").length}
              </CardTitle>
              <CardDescription>Available Units</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-green-500 text-sm">Ready to respond</div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="map" className="space-y-4">
          <TabsList>
            <TabsTrigger value="map">Map View</TabsTrigger>
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="alerts">Alert History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="map" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Ambulance Tracking Map</CardTitle>
                <CardDescription>
                  Real-time locations of emergency vehicles near you
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="aspect-video flex items-center justify-center border-t">
                  {renderGoogleMap()}
                </div>
              </CardContent>
            </Card>
            
            {loading ? (
              <Card>
                <CardContent className="flex items-center justify-center h-40">
                  <p>Loading ambulance data...</p>
                </CardContent>
              </Card>
            ) : ambulances.filter(a => a.isNearby).length > 0 && (
              <Card className="border-t-4 border-t-emergency-police">
                <CardHeader className="bg-blue-50 text-blue-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 mt-0.5 text-blue-500" />
                    <CardTitle className="text-blue-800">Nearby Ambulance Alert</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {ambulances.filter(a => a.isNearby).map(ambulance => (
                    <div key={ambulance.id} className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{ambulance.vehicleNumber}</h3>
                          <p className="text-sm">Driver: {ambulance.driverName}</p>
                        </div>
                        <div className="flex gap-2">
                          {ambulance.severity && (
                            <Badge className={getSeverityBadgeClass(ambulance.severity)}>
                              {ambulance.severity.charAt(0).toUpperCase() + ambulance.severity.slice(1)}
                            </Badge>
                          )}
                          <Badge className={getStatusBadgeClass(ambulance.status)}>
                            {ambulance.status === "en-route" ? "En Route" : "Idle"}
                          </Badge>
                          <Badge className="bg-blue-500 text-white">
                            {ambulance.distance}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-1 text-sm text-gray-700">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <div>Current Location: {ambulance.location.address}</div>
                          {ambulance.destination && (
                            <div className="text-blue-700">
                              Destination: {ambulance.destination.name} ({ambulance.destination.eta})
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          Last updated: {formatTimestamp(ambulance.lastUpdated)}
                        </div>
                        <Button size="sm">Assist</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="list" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="flex items-center justify-center h-40">
                  <p>Loading ambulance data...</p>
                </CardContent>
              </Card>
            ) : ambulances.length > 0 ? (
              ambulances.filter(a => a.isNearby).map(ambulance => (
                <Card key={ambulance.id} className={`border-l-4 ${ambulance.isNearby ? "border-l-blue-500" : ""}`}>
                  <CardHeader>
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <CardTitle>{ambulance.vehicleNumber}</CardTitle>
                        <CardDescription>
                          Driver: {ambulance.driverName}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {ambulance.isNearby && (
                          <Badge className="bg-blue-500 text-white">Nearby ({ambulance.distance})</Badge>
                        )}
                        {ambulance.severity && (
                          <Badge className={getSeverityBadgeClass(ambulance.severity)}>
                            {ambulance.severity.charAt(0).toUpperCase() + ambulance.severity.slice(1)}
                          </Badge>
                        )}
                        <Badge className={getStatusBadgeClass(ambulance.status)}>
                          {ambulance.status === "en-route" ? "En Route" : "Idle"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-1 text-gray-700">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div>Current Location: {ambulance.location.address}</div>
                        {ambulance.destination && (
                          <div className="text-blue-700">
                            Destination: {ambulance.destination.name} ({ambulance.destination.eta})
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Last updated: {formatTimestamp(ambulance.lastUpdated)}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No nearby ambulances at this time</p>
                  <p className="text-sm text-gray-400 mt-2">Ambulances within {NEARBY_THRESHOLD} km of your location will appear here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Alert History</CardTitle>
                <CardDescription>
                  Recent notifications and alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border-l-4 border-l-blue-500 pl-4 py-2">
                    <p className="font-medium">Nearby ambulance alert</p>
                    <p className="text-sm text-gray-600">An ambulance is in your vicinity</p>
                    <p className="text-xs text-gray-400">Today, 10:23 AM</p>
                  </div>
                  
                  <div className="border-l-4 border-l-red-500 pl-4 py-2">
                    <p className="font-medium">Emergency: Multi-vehicle accident reported</p>
                    <p className="text-sm text-gray-600">Highway 101, Northbound near Exit 432</p>
                    <p className="text-xs text-gray-400">Today, 9:15 AM</p>
                  </div>
                  
                  <div className="border-l-4 border-l-blue-500 pl-4 py-2">
                    <p className="font-medium">Ambulance was in your vicinity</p>
                    <p className="text-sm text-gray-600">Ambulance transporting patient to hospital</p>
                    <p className="text-xs text-gray-400">Yesterday, 3:45 PM</p>
                  </div>
                  
                  <div className="border-l-4 border-l-gray-300 pl-4 py-2">
                    <p className="font-medium">System Notification</p>
                    <p className="text-sm text-gray-600">3 new ambulances added to the tracking system</p>
                    <p className="text-xs text-gray-400">Yesterday, 9:00 AM</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <Card>
          <CardHeader className="bg-yellow-50 text-yellow-800 border-b border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <CardTitle className="text-yellow-800">Important Notice</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <p>
              This is a demo version of the Lifeline Emergency Response app. In a real implementation, this would include:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Live GPS tracking of all ambulances in the city</li>
              <li>Automatic proximity alerts when ambulances are nearby</li>
              <li>Traffic management suggestions for ambulance routes</li>
              <li>Communication channels with ambulance drivers</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default PoliceDashboard;
