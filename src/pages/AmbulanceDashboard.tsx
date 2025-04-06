import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, MapPin, Phone, Calendar, Plus, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/RealtimeAuthContext";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useFirebaseDatabase } from "@/hooks/use-firebase-database";
import { 
  ref,
  onValue,
  off,
  update,
  query,
  orderByChild,
  equalTo,
  get,
  set,
  push
} from "firebase/database";
import { db } from "@/lib/firebase";
import { EmergencyCase, CaseStatus, HospitalWithLocation } from "@/models/types";
import { calculateDistance, calculateETA, formatETA } from "@/utils/distance";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const AmbulanceDashboard: React.FC = () => {
  const [cases, setCases] = useState<EmergencyCase[]>([]);
  const [activeCases, setActiveCases] = useState<EmergencyCase[]>([]);
  const [completedCases, setCompletedCases] = useState<EmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [ambulanceStatus, setAmbulanceStatus] = useState<"available" | "busy" | "offline" | "en-route" | "idle">("available");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState<HospitalWithLocation[]>([]);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const locationTrackingRef = useRef<(() => void) | null>(null);
  
  const [newCase, setNewCase] = useState({
    patientName: "",
    age: "",
    gender: "male",
    symptoms: "",
    severity: "stable",
    description: "",
    address: "",
    useCurrentLocation: true
  });
  
  const { toast } = useToast();
  const { user } = useAuth();
  const location = useGeolocation({ enableHighAccuracy: true }, 10000);
  
  const { updateLocation, startLocationTracking: dbStartLocationTracking } = useFirebaseDatabase({
    path: 'ambulances'
  });

  useEffect(() => {
    if (!user || !location.latitude || !location.longitude) return;
    
    try {
      const ambulanceRef = ref(db, `ambulances/${user.id}`);
      update(ambulanceRef, {
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          lastUpdated: new Date().toISOString(),
          address: "Current Location"
        },
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error updating ambulance location:", error);
    }
  }, [location.latitude, location.longitude, user]);
  
  useEffect(() => {
    if (!location.latitude || !location.longitude) return;
    
    const fetchHospitals = async () => {
      try {
        const hospitalsRef = ref(db, "hospitals");
        const snapshot = await get(hospitalsRef);
        
        if (snapshot.exists()) {
          const hospitals: HospitalWithLocation[] = [];
          
          snapshot.forEach((childSnapshot) => {
            const hospital = childSnapshot.val();
            hospital.id = childSnapshot.key;
            
            if (hospital.location?.latitude && hospital.location?.longitude) {
              const distance = calculateDistance(
                location.latitude!,
                location.longitude!,
                hospital.location.latitude,
                hospital.location.longitude
              );
              
              hospital.distance = distance;
              hospital.formattedDistance = `${distance.toFixed(1)} km`;
              
              if (distance <= 50) {
                hospitals.push(hospital as HospitalWithLocation);
              }
            }
          });
          
          hospitals.sort((a, b) => {
            const distanceA = typeof a.distance === 'number' ? a.distance : 
                              typeof a.distance === 'string' ? parseFloat(a.distance) : 0;
            const distanceB = typeof b.distance === 'number' ? b.distance : 
                              typeof b.distance === 'string' ? parseFloat(b.distance) : 0;
            return distanceA - distanceB;
          });

          setNearbyHospitals(hospitals);
        }
      } catch (error) {
        console.error("Error fetching hospitals:", error);
      }
    };
    
    fetchHospitals();
  }, [location.latitude, location.longitude]);
  
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
              
              setAmbulanceStatus(caseData.status === "en-route" ? "en-route" : "busy");
              
              if (caseData.status !== "en-route" && isTrackingLocation) {
                stopLocationTracking();
              }
            }
          });
          
          setActiveCases(activeEmergencyCases);
          setCompletedCases(completedEmergencyCases);
          
          if (activeEmergencyCases.length === 0) {
            setAmbulanceStatus("available");
            
            const ambulanceRef = ref(db, `ambulances/${user.id}`);
            update(ambulanceRef, {
              status: "available",
              lastUpdated: new Date().toISOString()
            });
            
            if (isTrackingLocation) {
              stopLocationTracking();
            }
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
  }, [user, toast, isTrackingLocation]);
  
  useEffect(() => {
    return () => {
      if (locationTrackingRef.current) {
        locationTrackingRef.current();
      }
    };
  }, []);
  
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
      
      await update(caseRef, {
        status: "accepted",
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
      
      const ambulanceRef = ref(db, `ambulances/${user.id}`);
      await update(ambulanceRef, {
        status: "busy",
        severity: emergencyCase.severity,
        caseId: emergencyCase.id,
        destination: {
          name: emergencyCase.hospital?.name || "Location",
          eta: eta
        },
        lastUpdated: new Date().toISOString()
      });
      
      setAmbulanceStatus("busy");
      
      toast({
        title: "Case Accepted",
        description: `You are now handling the case for ${emergencyCase.patientName}`,
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
  
  const openGoogleMaps = (emergencyCase: EmergencyCase) => {
    if (!emergencyCase.hospital?.address && !emergencyCase.hospital) {
      toast({
        title: "Missing destination",
        description: "No hospital has accepted this case yet",
        variant: "destructive",
      });
      return;
    }
    
    let destination;
    const hospitalLocation = emergencyCase.hospital as unknown as HospitalWithLocation;
    if (hospitalLocation.location?.latitude && hospitalLocation.location?.longitude) {
      destination = `${hospitalLocation.location.latitude},${hospitalLocation.location.longitude}`;
    } else {
      destination = encodeURIComponent(emergencyCase.hospital?.address || emergencyCase.hospital?.name || "Hospital");
    }
    
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
  };
  
  const startLocationTracking = () => {
    if (!user) return;
    
    stopLocationTracking();
    
    const getCurrentLocation = async () => {
      if (!location.latitude || !location.longitude) {
        throw new Error("Location not available");
      }
      return {
        latitude: location.latitude,
        longitude: location.longitude
      };
    };
    
    locationTrackingRef.current = dbStartLocationTracking(
      user.id, 
      getCurrentLocation,
      120000
    );
    
    setIsTrackingLocation(true);
    
    toast({
      title: "Location Tracking Started",
      description: "Your location will be updated every 2 minutes",
    });
  };
  
  const stopLocationTracking = () => {
    if (locationTrackingRef.current) {
      locationTrackingRef.current();
      locationTrackingRef.current = null;
    }
    setIsTrackingLocation(false);
  };
  
  const handleStartRoute = async (emergencyCase: EmergencyCase) => {
    if (!user) return;
    
    try {
      const caseRef = ref(db, `emergencyCases/${emergencyCase.id}`);
      
      let eta = "Calculating...";
      let distanceKm = 0;
      
      const hospitalLocation = emergencyCase.hospital as unknown as HospitalWithLocation;
      if (hospitalLocation?.location?.latitude && hospitalLocation?.location?.longitude && 
          location.latitude && location.longitude) {
        distanceKm = calculateDistance(
          location.latitude,
          location.longitude,
          hospitalLocation.location.latitude,
          hospitalLocation.location.longitude
        );
        
        eta = formatETA(calculateETA(distanceKm));
      }
      
      await update(caseRef, {
        status: "en-route",
        ambulanceInfo: {
          ...emergencyCase.ambulanceInfo,
          estimatedArrival: eta
        },
        updatedAt: new Date().toISOString()
      });
      
      const ambulanceRef = ref(db, `ambulances/${user.id}`);
      await update(ambulanceRef, {
        status: "en-route",
        lastUpdated: new Date().toISOString()
      });
      
      setAmbulanceStatus("en-route");
      
      startLocationTracking();
      
      toast({
        title: "En Route",
        description: `You are now en route to ${emergencyCase.hospital?.name || "the hospital"}`,
      });
    } catch (error) {
      console.error("Error updating route status:", error);
      toast({
        title: "Error",
        description: "Failed to update route status",
        variant: "destructive",
      });
    }
  };
  
  const handleMarkArrived = async (emergencyCase: EmergencyCase) => {
    if (!user) return;
    
    try {
      const caseRef = ref(db, `emergencyCases/${emergencyCase.id}`);
      
      await update(caseRef, {
        status: "arrived",
        updatedAt: new Date().toISOString()
      });
      
      const ambulanceRef = ref(db, `ambulances/${user.id}`);
      await update(ambulanceRef, {
        status: "arrived",
        lastUpdated: new Date().toISOString()
      });
      
      stopLocationTracking();
      
      toast({
        title: "Marked as Arrived",
        description: `You have marked your arrival at the hospital.`,
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
  
  const handleCompleteCase = async (emergencyCase: EmergencyCase) => {
    if (!user) return;
    
    try {
      const caseRef = ref(db, `emergencyCases/${emergencyCase.id}`);
      
      await update(caseRef, {
        status: "completed",
        updatedAt: new Date().toISOString()
      });
      
      const ambulanceRef = ref(db, `ambulances/${user.id}`);
      await update(ambulanceRef, {
        status: "available",
        caseId: null,
        destination: null,
        severity: null,
        lastUpdated: new Date().toISOString()
      });
      
      setAmbulanceStatus("available");
      
      if (isTrackingLocation) {
        stopLocationTracking();
      }
      
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
  
  const handleCancelCase = async (emergencyCase: EmergencyCase) => {
    if (!user) return;
    
    try {
      const caseRef = ref(db, `emergencyCases/${emergencyCase.id}`);
      
      await update(caseRef, {
        status: "canceled",
        updatedAt: new Date().toISOString()
      });
      
      const ambulanceRef = ref(db, `ambulances/${user.id}`);
      await update(ambulanceRef, {
        status: "available",
        caseId: null,
        destination: null,
        severity: null,
        lastUpdated: new Date().toISOString()
      });
      
      setAmbulanceStatus("available");
      
      if (isTrackingLocation) {
        stopLocationTracking();
      }
      
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
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCase(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSelectChange = (name: string, value: string) => {
    setNewCase(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleLocationToggle = () => {
    setNewCase(prev => ({
      ...prev,
      useCurrentLocation: !prev.useCurrentLocation
    }));
  };
  
  const handleCreateCase = async () => {
    if (!user) return;

    if (!newCase.useCurrentLocation && !newCase.address) {
      toast({
        title: "Address required",
        description: "Please enter an address or enable current location.",
        variant: "destructive",
      });
      return;
    }
    
    if (newCase.useCurrentLocation && (!location.latitude || !location.longitude)) {
      toast({
        title: "Location required",
        description: "Your location is needed to create a case. Please enable location services or enter an address manually.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { patientName, age, gender, symptoms, severity, description, address, useCurrentLocation } = newCase;
      
      if (!patientName || !age || !symptoms || !description) {
        toast({
          title: "Missing information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }
      
      const casesRef = ref(db, "emergencyCases");
      const newCaseRef = push(casesRef);
      
      const locationData = useCurrentLocation
        ? {
            latitude: location.latitude!,
            longitude: location.longitude!,
            address: "Current Location"
          }
        : {
            address: address,
            latitude: 0,
            longitude: 0
          };
      
      const caseData = {
        patientName,
        age: parseInt(age),
        gender,
        symptoms,
        severity,
        description,
        type: "medical",
        priority: severity === "critical" ? "critical" : severity === "serious" ? "high" : "medium",
        status: "pending" as CaseStatus,
        location: locationData,
        reportedBy: {
          id: user.id,
          name: user.name,
          role: "ambulance"
        },
        ambulanceId: user.id,
        ambulanceInfo: {
          id: user.id,
          driver: user.name,
          vehicleNumber: user.details?.vehicleNumber || "Unknown"
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await set(newCaseRef, caseData);
      
      toast({
        title: "Case Created",
        description: "The emergency case has been created and notified to nearby hospitals",
      });
      
      setIsDialogOpen(false);
      setNewCase({
        patientName: "",
        age: "",
        gender: "male",
        symptoms: "",
        severity: "stable",
        description: "",
        address: "",
        useCurrentLocation: true
      });
    } catch (error) {
      console.error("Error creating case:", error);
      toast({
        title: "Error",
        description: "Failed to create emergency case",
        variant: "destructive",
      });
    }
  };
  
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
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Ambulance Control Panel</h1>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>New Emergency Case</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Emergency Case</DialogTitle>
                <DialogDescription>
                  Enter the patient details to create a new emergency case. This will be sent to nearby hospitals.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patientName">Patient Name</Label>
                    <Input
                      id="patientName"
                      name="patientName"
                      value={newCase.patientName}
                      onChange={handleInputChange}
                      placeholder="Full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      value={newCase.age}
                      onChange={handleInputChange}
                      placeholder="Patient age"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={newCase.gender}
                      onValueChange={(value) => handleSelectChange("gender", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="severity">Severity</Label>
                    <Select
                      value={newCase.severity}
                      onValueChange={(value) => handleSelectChange("severity", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stable">Stable</SelectItem>
                        <SelectItem value="serious">Serious</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="symptoms">Symptoms</Label>
                  <Input
                    id="symptoms"
                    name="symptoms"
                    value={newCase.symptoms}
                    onChange={handleInputChange}
                    placeholder="Main symptoms"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={newCase.description}
                    onChange={handleInputChange}
                    placeholder="Detailed description of the emergency"
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox 
                      id="useCurrentLocation" 
                      checked={newCase.useCurrentLocation} 
                      onCheckedChange={handleLocationToggle}
                    />
                    <Label htmlFor="useCurrentLocation">Use my current location</Label>
                  </div>
                  
                  {!newCase.useCurrentLocation && (
                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        name="address"
                        value={newCase.address}
                        onChange={handleInputChange}
                        placeholder="Enter full address"
                      />
                      <p className="text-xs text-gray-500">
                        Please provide a complete address for accurate ETA calculations
                      </p>
                    </div>
                  )}
                  
                  {newCase.useCurrentLocation && (
                    <div className="text-sm text-blue-600 flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      Using your current location
                    </div>
                  )}
                </div>
                
                {nearbyHospitals.length > 0 && newCase.useCurrentLocation && (
                  <div className="space-y-2">
                    <Label>Nearby Hospitals ({nearbyHospitals.length})</Label>
                    <div className="max-h-24 overflow-y-auto bg-gray-50 p-2 rounded text-sm">
                      {nearbyHospitals.map((hospital) => (
                        <div key={hospital.id} className="flex justify-between py-1 border-b">
                          <span>{hospital.name || hospital.organization || "Unknown Hospital"}</span>
                          <span className="text-blue-600">{hospital.formattedDistance || "Unknown"}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      This emergency will be sent to these hospitals based on your current location.
                    </p>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateCase}>Create Emergency Case</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
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
              <div className={isTrackingLocation ? "text-purple-500 text-sm" : "text-gray-500 text-sm"}>
                {isTrackingLocation ? "Tracking location..." : "Ready for dispatch"}
              </div>
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
                  <p className="text-sm text-gray-400 mt-2">Click "New Emergency Case" button to create a case</p>
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
                        {isTrackingLocation && emergencyCase.status === "en-route" && (
                          <Badge className="bg-purple-500">Location Tracking</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-1 text-gray-700">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div>Location: {emergencyCase.location?.address}</div>
                        {emergencyCase.hospital ? (
                          <div className="text-blue-700 font-medium">
                            Hospital: {emergencyCase.hospital?.name}
                          </div>
                        ) : (
                          <div className="text-yellow-500 italic">
                            Waiting for hospital assignment
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {emergencyCase.hospital && (
                      <>
                        <div className="flex items-center gap-1 text-gray-700">
                          <Phone className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <div>
                            Contact: {emergencyCase.hospital.contact || "N/A"}
                          </div>
                        </div>
                        
                        <div className="flex justify-end gap-2 mt-4">
                          {emergencyCase.status === "accepted" && (
                            <Button 
                              onClick={() => handleStartRoute(emergencyCase)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Navigation className="mr-2 h-4 w-4" />
                              Start Route
                            </Button>
                          )}
                          
                          {emergencyCase.status === "en-route" && (
                            <Button 
                              onClick={() => handleMarkArrived(emergencyCase)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Mark as Arrived
                            </Button>
                          )}
                          
                          {emergencyCase.status === "arrived" && (
                            <Button 
                              onClick={() => handleCompleteCase(emergencyCase)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="mr-2 h-4 w-4" />
                              Complete Case
                            </Button>
                          )}
                          
                          <Button 
                            onClick={() => openGoogleMaps(emergencyCase)}
                            variant="outline"
                          >
                            <MapPin className="mr-2 h-4 w-4" />
                            View on Map
                          </Button>
                          
                          <Button 
                            onClick={() => handleCancelCase(emergencyCase)}
                            variant="outline"
                            className="text-red-500 hover:bg-red-50"
                          >
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No active cases at this time</p>
                  <p className="text-sm text-gray-400 mt-2">Accepted cases will appear here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            {completedCases.length > 0 ? (
              completedCases.map(emergencyCase => (
                <Card key={emergencyCase.id} className="border-l-4 border-l-gray-400">
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
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar className="h-4 w-4" />
                      <div>
                        Completed: {new Date(emergencyCase.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    {emergencyCase.hospital && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin className="h-4 w-4" />
                        <div>Hospital: {emergencyCase.hospital.name}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-gray-500">No completed cases yet</p>
                  <p className="text-sm text-gray-400 mt-2">Your case history will appear here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AmbulanceDashboard;
