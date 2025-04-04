import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, MapPin, Phone, AlertCircle, Calendar, Clipboard, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/RealtimeAuthContext";
import { useGeolocation } from "@/hooks/use-geolocation";
import { 
  ref,
  onValue,
  off,
  update,
  query,
  orderByChild,
  equalTo,
  get,
  set
} from "firebase/database";
import { db } from "@/lib/firebase";
import { EmergencyCase, CaseStatus } from "@/models/types";
import { calculateDistance, calculateETA, formatETA } from "@/utils/distance";

const AmbulanceDashboard: React.FC = () => {
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [activeCases, setActiveCases] = useState<EmergencyCase[]>([]);
  const [completedCases, setCompletedCases] = useState<EmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [ambulanceStatus, setAmbulanceStatus] = useState<"available" | "busy" | "offline" | "en-route" | "idle">("available");
  
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useGeolocation({ enableHighAccuracy: true }, 10000);
  
  useEffect(() => {
    if (!user) return;
    
    // Update ambulance location every time it changes
    if (location.latitude && location.longitude) {
      try {
        const ambulanceRef = ref(db, `ambulances/${user.id}`);
        update(ambulanceRef, {
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            lastUpdated: new Date().toISOString(),
            address: "Current Location" // This would be replaced with actual reverse geocoding
          },
          lastUpdated: new Date().toISOString()
        });
      } catch (error) {
        console.error("Error updating ambulance location:", error);
      }
    }
  }, [location.latitude, location.longitude, user]);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchAvailableCases = () => {
      try {
        const casesRef = ref(db, "emergencyCases");
        const pendingQuery = query(
          casesRef, 
          orderByChild("status"), 
          equalTo("pending")
        );
        
        const unsubscribe = onValue(pendingQuery, (snapshot) => {
          const availableCases: EmergencyCase[] = [];
          
          snapshot.forEach((childSnapshot) => {
            const caseData = childSnapshot.val();
            availableCases.push({
              id: childSnapshot.key || "",
              ...caseData,
            } as EmergencyCase);
          });
          
          setCases(availableCases);
          setLoading(false);
        }, (error) => {
          console.error("Error fetching cases:", error);
          toast({
            title: "Error",
            description: "Failed to fetch emergency cases",
            variant: "destructive",
          });
          setLoading(false);
        });
        
        return () => off(pendingQuery);
      } catch (error) {
        console.error("Error setting up cases listener:", error);
        toast({
          title: "Error",
          description: "Failed to fetch emergency cases",
          variant: "destructive",
        });
        setLoading(false);
      }
    };
    
    fetchAvailableCases();
  }, [user, toast]);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchActiveCases = () => {
      try {
        const casesRef = ref(db, "emergencyCases");
        const activeQuery = query(
          casesRef, 
          orderByChild("ambulanceId"), 
          equalTo(user.id)
        );
        
        const unsubscribe = onValue(activeQuery, (snapshot) => {
          const activeEmergencyCases: EmergencyCase[] = [];
          const completedEmergencyCases: EmergencyCase[] = [];
          
          snapshot.forEach((childSnapshot) => {
            const caseData = childSnapshot.val();
            
            if (caseData.status === "completed" || caseData.status === "canceled") {
              completedEmergencyCases.push({
                id: childSnapshot.key || "",
                ...caseData,
              } as EmergencyCase);
            } else {
              activeEmergencyCases.push({
                id: childSnapshot.key || "",
                ...caseData,
              } as EmergencyCase);
              
              // Update ambulance status if we have active cases
              setAmbulanceStatus(caseData.status === "en-route" ? "en-route" : "busy");
            }
          });
          
          setActiveCases(activeEmergencyCases);
          setCompletedCases(completedEmergencyCases);
          
          // Update ambulance status to available if no active cases
          if (activeEmergencyCases.length === 0) {
            setAmbulanceStatus("available");
            
            // Update status in database
            const ambulanceRef = ref(db, `ambulances/${user.id}`);
            update(ambulanceRef, {
              status: "available",
              lastUpdated: new Date().toISOString()
            });
          }
        }, (error) => {
          console.error("Error fetching active cases:", error);
          toast({
            title: "Error",
            description: "Failed to fetch your active cases",
            variant: "destructive",
          });
        });
        
        return () => off(activeQuery);
      } catch (error) {
        console.error("Error setting up active cases listener:", error);
        toast({
          title: "Error",
          description: "Failed to fetch your active cases",
          variant: "destructive",
        });
      }
    };
    
    fetchActiveCases();
  }, [user, toast]);
  
  // Accept case handler
  const handleAcceptCase = async (emergencyCase: EmergencyCase) => {
    if (!user || !location.latitude || !location.longitude) {
      toast({
        title: "Location required",
        description: "Your location is needed to accept a case. Please enable location services.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const caseRef = ref(db, `emergencyCases/${emergencyCase.id}`);
      
      // Calculate ETA based on distance
      let eta = "Unknown";
      let distanceKm = 0;
      
      if (emergencyCase.location?.latitude && emergencyCase.location?.longitude) {
        distanceKm = calculateDistance(
          location.latitude,
          location.longitude,
          emergencyCase.location.latitude,
          emergencyCase.location.longitude
        );
        
        eta = formatETA(calculateETA(distanceKm));
      }
      
      // Update case with ambulance info
      await update(caseRef, {
        status: "en-route",
        ambulanceId: user.id,
        ambulanceInfo: {
          id: user.id,
          driver: user.name,
          vehicleNumber: user.details?.vehicleNumber || "Unknown",
          driverName: user.name,
          estimatedArrival: eta
        },
        updatedAt: new Date().toISOString()
      });
      
      // Update ambulance status
      const ambulanceRef = ref(db, `ambulances/${user.id}`);
      await update(ambulanceRef, {
        status: "en-route",
        severity: emergencyCase.severity,
        caseId: emergencyCase.id,
        destination: {
          name: emergencyCase.hospital?.name || "Location",
          eta: eta
        },
        lastUpdated: new Date().toISOString()
      });
      
      setAmbulanceStatus("en-route");
      
      toast({
        title: "Case Accepted",
        description: `You are now on your way to ${emergencyCase.location?.address || 'the emergency location'}`,
      });
    } catch (error) {
      console.error("Error accepting case:", error);
      toast({
        title: "Error",
        description: "Failed to accept the emergency case",
        variant: "destructive",
      });
    }
  };
  
  // Mark as arrived handler
  const handleMarkArrived = async (emergencyCase: EmergencyCase) => {
    if (!user) return;
    
    try {
      const caseRef = ref(db, `emergencyCases/${emergencyCase.id}`);
      
      await update(caseRef, {
        status: "arrived",
        updatedAt: new Date().toISOString()
      });
      
      // Update ambulance status
      const ambulanceRef = ref(db, `ambulances/${user.id}`);
      await update(ambulanceRef, {
        status: "arrived",
        lastUpdated: new Date().toISOString()
      });
      
      toast({
        title: "Marked as Arrived",
        description: `You have marked your arrival at the emergency location.`,
      });
    } catch (error) {
      console.error("Error marking arrival:", error);
      toast({
        title: "Error",
        description: "Failed to update case status",
        variant: "destructive",
      });
    }
  };
  
  // Complete case handler
  const handleCompleteCase = async (emergencyCase: EmergencyCase) => {
    if (!user) return;
    
    try {
      const caseRef = ref(db, `emergencyCases/${emergencyCase.id}`);
      
      await update(caseRef, {
        status: "completed",
        updatedAt: new Date().toISOString()
      });
      
      // Update ambulance status
      const ambulanceRef = ref(db, `ambulances/${user.id}`);
      await update(ambulanceRef, {
        status: "available",
        caseId: null,
        destination: null,
        severity: null,
        lastUpdated: new Date().toISOString()
      });
      
      setAmbulanceStatus("available");
      
      toast({
        title: "Case Completed",
        description: `The emergency case has been completed and recorded.`,
      });
    } catch (error) {
      console.error("Error completing case:", error);
      toast({
        title: "Error",
        description: "Failed to complete the case",
        variant: "destructive",
      });
    }
  };
  
  // Cancel case handler
  const handleCancelCase = async (emergencyCase: EmergencyCase) => {
    if (!user) return;
    
    try {
      const caseRef = ref(db, `emergencyCases/${emergencyCase.id}`);
      
      await update(caseRef, {
        status: "canceled",
        updatedAt: new Date().toISOString()
      });
      
      // Update ambulance status
      const ambulanceRef = ref(db, `ambulances/${user.id}`);
      await update(ambulanceRef, {
        status: "available",
        caseId: null,
        destination: null,
        severity: null,
        lastUpdated: new Date().toISOString()
      });
      
      setAmbulanceStatus("available");
      
      toast({
        title: "Case Canceled",
        description: `The emergency case has been canceled.`,
      });
    } catch (error) {
      console.error("Error canceling case:", error);
      toast({
        title: "Error",
        description: "Failed to cancel the case",
        variant: "destructive",
      });
    }
  };

  // Helper functions for UI
  const getSeverityBadgeClass = (severity: string | undefined) => {
    if (!severity) return "bg-gray-500 text-white";
    switch(severity) {
      case "critical": return "bg-red-500 text-white";
      case "serious": return "bg-orange-500 text-white";
      case "stable": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };
  
  const getStatusBadgeClass = (status: CaseStatus) => {
    switch(status) {
      case "pending": return "bg-yellow-500 text-white";
      case "accepted": return "bg-blue-500 text-white";
      case "en-route": return "bg-purple-500 text-white";
      case "arrived": return "bg-green-500 text-white";
      case "completed": return "bg-gray-500 text-white";
      case "canceled": return "bg-red-300 text-white";
      default: return "bg-gray-500 text-white";
    }
  };
  
  const formatDistance = (distance: number): string => {
    return `${distance.toFixed(1)} km`;
  };
  
  // Calculate distances for cases based on current location
  const casesWithDistance = cases.map(emergencyCase => {
    let distance = 0;
    if (location.latitude && location.longitude && emergencyCase.location?.latitude && emergencyCase.location?.longitude) {
      distance = calculateDistance(
        location.latitude,
        location.longitude,
        emergencyCase.location.latitude,
        emergencyCase.location.longitude
      );
    }
    return {
      ...emergencyCase,
      calculatedDistance: distance,
      formattedDistance: formatDistance(distance)
    };
  }).sort((a, b) => a.calculatedDistance - b.calculatedDistance);

  return (
    <DashboardLayout title="Ambulance Dashboard" role="ambulance">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">{cases.length}</CardTitle>
              <CardDescription>Available Cases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-yellow-500 text-sm">New emergency requests</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">{activeCases.length}</CardTitle>
              <CardDescription>Active Cases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-blue-500 text-sm">Currently en route or at scene</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">{completedCases.length}</CardTitle>
              <CardDescription>Completed Cases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-green-500 text-sm">Successfully resolved</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">{ambulanceStatus}</CardTitle>
              <CardDescription>Current Status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-gray-500 text-sm">Ready for dispatch</div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="available" className="space-y-4">
          <TabsList>
            <TabsTrigger value="available">Available Cases</TabsTrigger>
            <TabsTrigger value="active">Active Cases</TabsTrigger>
            <TabsTrigger value="history">Case History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="available" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="flex items-center justify-center h-40">
                  <p>Loading available cases...</p>
                </CardContent>
              </Card>
            ) : casesWithDistance.length > 0 ? (
              casesWithDistance.map(emergencyCase => (
                <Card key={emergencyCase.id} className="border-l-4 border-l-yellow-500">
                  <CardHeader>
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <CardTitle>{emergencyCase.patientName}</CardTitle>
                        <CardDescription>
                          {emergencyCase.description}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getSeverityBadgeClass(emergencyCase.severity)}>
                          {emergencyCase.severity?.charAt(0).toUpperCase() + emergencyCase.severity?.slice(1)}
                        </Badge>
                        <Badge className={getStatusBadgeClass(emergencyCase.status)}>
                          {emergencyCase.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-1 text-gray-700">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div>Location: {emergencyCase.location?.address}</div>
                        <div className="text-blue-700">
                          Distance: {emergencyCase.formattedDistance}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="justify-end">
                    <Button onClick={() => handleAcceptCase(emergencyCase)}>Accept Case</Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No available cases at this time</p>
                  <p className="text-sm text-gray-400 mt-2">Check back later for new emergencies</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="active" className="space-y-4">
            {activeCases.length > 0 ? (
              activeCases.map(emergencyCase => (
                <Card key={emergencyCase.id} className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <CardTitle>{emergencyCase.patientName}</CardTitle>
                        <CardDescription>
                          {emergencyCase.description}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getSeverityBadgeClass(emergencyCase.severity)}>
                          {emergencyCase.severity?.charAt(0).toUpperCase() + emergencyCase.severity?.slice(1)}
                        </Badge>
                        <Badge className={getStatusBadgeClass(emergencyCase.status)}>
                          {emergencyCase.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-1 text-gray-700">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div>Location: {emergencyCase.location?.address}</div>
                        <div className="text-blue-700">
                          Destination: {emergencyCase.hospital?.name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-gray-700">
                      <Phone className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        Contact Hospital: {emergencyCase.hospital?.contact}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="justify-end">
                    {emergencyCase.status === "en-route" && (
                      <Button onClick={() => handleMarkArrived(emergencyCase)}>Mark as Arrived</Button>
                    )}
                    {emergencyCase.status === "arrived" && (
                      <Button onClick={() => handleCompleteCase(emergencyCase)}>Complete Case</Button>
                    )}
                    <Button onClick={() => handleCancelCase(emergencyCase)}>Cancel Case</Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No active cases at this time</p>
                  <p className="text-sm text-gray-400 mt-2">Once you accept a case, it will appear here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            {completedCases.length > 0 ? (
              completedCases.map(emergencyCase => (
                <Card key={emergencyCase.id} className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <CardTitle>{emergencyCase.patientName}</CardTitle>
                        <CardDescription>
                          {emergencyCase.description}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getSeverityBadgeClass(emergencyCase.severity)}>
                          {emergencyCase.severity?.charAt(0).toUpperCase() + emergencyCase.severity?.slice(1)}
                        </Badge>
                        <Badge className={getStatusBadgeClass(emergencyCase.status)}>
                          {emergencyCase.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-1 text-gray-700">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div>Location: {emergencyCase.location?.address}</div>
                        <div className="text-blue-700">
                          Destination: {emergencyCase.hospital?.name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-gray-700">
                      <Phone className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        Contact Hospital: {emergencyCase.hospital?.contact}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No completed cases yet</p>
                  <p className="text-sm text-gray-400 mt-2">Once you complete a case, it will be recorded here</p>
                </CardContent>
              </Card>
            )}
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
              <li>Real-time GPS tracking of your ambulance</li>
              <li>Automatic updates to the hospital with patient ETA</li>
              <li>Communication channels with hospitals and dispatch</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AmbulanceDashboard;
