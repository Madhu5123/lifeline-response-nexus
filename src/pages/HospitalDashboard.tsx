
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Clock, X, MapPin, Phone, AlertCircle, Calendar, Clipboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/RealtimeAuthContext";
import axios from "axios";
import { 
  ref,
  get,
  set,
  update,
  remove,
  push,
  onValue,
  off,
  query,
  orderByChild,
  equalTo,
  serverTimestamp
} from "firebase/database";
import { db } from "@/lib/firebase";
import { EmergencyCase } from "@/models/types";
// import { calculateDistance, calculateETA, formatETA } from "@/utils/distance";

const HospitalDashboard: React.FC = () => {
  const [pendingCases, setPendingCases] = useState<EmergencyCase[]>([]);
  const [activeCases, setActiveCases] = useState<EmergencyCase[]>([]);
  const [historyCases, setHistoryCases] = useState<EmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [ambulanceLocations, setAmbulanceLocations] = useState<Record<string, {
    latitude: number;
    longitude: number;
    lastUpdated: string;
  }>>({});
  const [stats, setStats] = useState({
    pendingCount: 0,
    activeCount: 0,
    availableBeds: 24, // Default value
  });
  
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Fetch pending cases that need a hospital
  useEffect(() => {
    if (!user) return;
    
    const fetchPendingCases = () => {
      try {
        const casesRef = ref(db, "emergencyCases");
        const pendingQuery = query(
          casesRef, 
          orderByChild("status"),
          equalTo("pending")
        );
        
        const unsubscribe = onValue(pendingQuery, (snapshot) => {
          const cases: EmergencyCase[] = [];
          snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            cases.push({
              id: childSnapshot.key || "",
              ...data,
            } as EmergencyCase);
          });
          
          setPendingCases(cases);
          setStats(prev => ({ ...prev, pendingCount: cases.length }));
          setLoading(false);
        }, (error) => {
          console.error("Error fetching pending cases:", error);
          toast({
            title: "Error",
            description: "Failed to fetch pending cases",
            variant: "destructive",
          });
          setLoading(false);
        });
        
        return () => off(pendingQuery);
      } catch (error) {
        console.error("Error setting up pending cases listener:", error);
        toast({
          title: "Error",
          description: "Failed to fetch pending cases",
          variant: "destructive",
        });
        setLoading(false);
      }
    };
    
    fetchPendingCases();
  }, [user, toast]);
  
  // Fetch active cases assigned to this hospital
  useEffect(() => {
    if (!user) return;
    
    const fetchActiveCases = () => {
      try {
        const casesRef = ref(db, "emergencyCases");
        const activeQuery = query(
          casesRef, 
          orderByChild("hospitalId"),
          equalTo(user.id)
        );
        
        const unsubscribe = onValue(activeQuery, (snapshot) => {
          const cases: EmergencyCase[] = [];
          snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            if (data.status === "accepted" || data.status === "en-route" || data.status === "arrived") {
              // Add ambulance ID to track location
              if (data.ambulanceId && !ambulanceLocations[data.ambulanceId]) {
                fetchAmbulanceLocation(data.ambulanceId);
              }
              
              cases.push({
                id: childSnapshot.key || "",
                ...data,
              } as EmergencyCase);
            }
          });
          
          setActiveCases(cases);
          setStats(prev => ({ ...prev, activeCount: cases.length }));
        }, (error) => {
          console.error("Error fetching active cases:", error);
          toast({
            title: "Error",
            description: "Failed to fetch active cases",
            variant: "destructive",
          });
        });
        
        return () => off(activeQuery);
      } catch (error) {
        console.error("Error setting up active cases listener:", error);
        toast({
          title: "Error",
          description: "Failed to fetch active cases",
          variant: "destructive",
        });
      }
    };
    
    fetchActiveCases();
  }, [user, toast, ambulanceLocations]);
  
  // Fetch ambulance real-time locations for active cases
  const fetchAmbulanceLocation = (ambulanceId: string) => {
    const ambulanceRef = ref(db, `ambulances/${ambulanceId}/location`);
    
    onValue(ambulanceRef, (snapshot) => {
      if (snapshot.exists()) {
        const locationData = snapshot.val();
        setAmbulanceLocations(prev => ({
          ...prev,
          [ambulanceId]: locationData
        }));
        
        // Update ETA for related cases
        // updateETAForAmbulance(ambulanceId, locationData);
      }
    });
  };
  
  // Update ETA based on new ambulance location
  // const updateETAForAmbulance = (ambulanceId: string, locationData: any) => {
  //   activeCases.forEach(async (activeCase) => {
  //     if (activeCase.ambulanceId === ambulanceId && 
  //         activeCase.status === "en-route" &&
  //         user?.details?.location?.latitude && 
  //         user?.details?.location?.longitude) {
        
  //       // Calculate distance between ambulance and hospital
  //       const etadistance = calculateDistance(
  //         locationData.latitude,
  //         locationData.longitude,
  //         user.details.location.latitude,
  //         user.details.location.longitude
  //       );
        
  //       // Calculate new ETA
  //       const eta = formatETA(calculateETA(etadistance));
        
  //       // Update case with new ETA
  //       const caseRef = ref(db, `emergencyCases/${activeCase.id}`);
        
  //       try {
  //         await update(caseRef, {
  //           ambulanceInfo: {
  //             ...activeCase.ambulanceInfo,
  //             estimatedArrival: eta,
  //             lastLocationUpdate: locationData.lastUpdated
  //           }
  //         });
  //       } catch (error) {
  //         console.error("Error updating ETA:", error);
  //       }
  //     }
  //   });
  // };
  
  // Fetch completed cases history
  useEffect(() => {
    if (!user) return;
    
    const fetchHistoryCases = () => {
      try {
        const casesRef = ref(db, "emergencyCases");
        const historyQuery = query(
          casesRef, 
          orderByChild("hospitalId"),
          equalTo(user.id)
        );
        
        const unsubscribe = onValue(historyQuery, (snapshot) => {
          const cases: EmergencyCase[] = [];
          snapshot.forEach((childSnapshot) => {
            const data = childSnapshot.val();
            if (data.status === "completed") {
              cases.push({
                id: childSnapshot.key || "",
                ...data,
              } as EmergencyCase);
            }
          });
          
          setHistoryCases(cases);
        }, (error) => {
          console.error("Error fetching history cases:", error);
          toast({
            title: "Error",
            description: "Failed to fetch case history",
            variant: "destructive",
          });
        });
        
        return () => off(historyQuery);
      } catch (error) {
        console.error("Error setting up history cases listener:", error);
        toast({
          title: "Error",
          description: "Failed to fetch case history",
          variant: "destructive",
        });
      }
    };
    
    fetchHistoryCases();
  }, [user, toast]);
  
const getLatLongFromAddress = async (address: string) => {
  const apiKey = "AIzaSyCn9PtxnG4vnNEy_-azKJoWCz5nYVxF3IY";
  const encodedAddress = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

  try {
    const response = await axios.get(url);
    const results = response.data.results;

    if (results.length > 0) {
      const location = results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng
      };
    }
  } catch (error) {
    console.error("Geocoding error:", error);
  }

  return {
    latitude: 0,
    longitude: 0
  };
};

const handleAcceptCase = async (caseId: string) => {
  if (!user) return;

  try {
    const address = user.details?.address || "Hospital Address";
    const location = user.details?.location || await getLatLongFromAddress(address);

    // Fetch the emergency case location
    const caseRef = ref(db, `emergencyCases/${caseId}`);
    const caseSnapshot = await get(caseRef);
    const caseData = caseSnapshot.val();

    const caseLocation = caseData?.location || { latitude: 0, longitude: 0 };

    // Calculate distance
    const distance = calculateDistance(
      location.latitude,
      location.longitude,
      caseLocation.latitude,
      caseLocation.longitude
    );

    const hospitalData = {
      id: user.id,
      name: user.details?.organization || "Hospital",
      address,
      contact: user.details?.phone || "Contact Number",
      distance,
      beds: stats.availableBeds,
      location
    };

    await update(caseRef, {
      status: "accepted",
      hospitalId: user.id,
      hospital: hospitalData,
      updatedAt: new Date().toISOString(),
    });

    setStats(prev => ({
      ...prev,
      availableBeds: prev.availableBeds - 1
    }));

    toast({
      title: "Case Accepted",
      description: `You have accepted the emergency case. The ambulance has been notified.`,
    });
  } catch (error) {
    console.error("Error accepting case:", error);
    toast({
      title: "Error",
      description: "Failed to accept the case",
      variant: "destructive",
    });
  }
};

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string => {
  const toRad = (value: number) => (value * Math.PI) / 180;

  const R = 6371; // Radius of Earth in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = R * c;

  return `${distanceKm.toFixed(2)} km`;
};

  
  // Reject a case
  const handleRejectCase = async (caseId: string) => {
    try {
      toast({
        title: "Case Rejected",
        description: `You have rejected the case. Other hospitals will be notified.`,
      });
      
      setPendingCases(pendingCases.filter(c => c.id !== caseId));
    } catch (error) {
      console.error("Error rejecting case:", error);
      toast({
        title: "Error",
        description: "Failed to reject the case",
        variant: "destructive",
      });
    }
  };
  
  // Navigate to ambulance tracking page
  const openAmbulanceTracker = (emergencyCase: EmergencyCase) => {
    if (!emergencyCase.ambulanceId) {
      toast({
        title: "Ambulance not assigned",
        description: "No ambulance has been assigned to this case yet",
        variant: "destructive", 
      });
      return;
    }
    
    navigate(`/hospital/track/${emergencyCase.id}`);
  };
  
  // Calculate time since last location update
  const getTimeSinceUpdate = (lastUpdated: string) => {
    const lastUpdate = new Date(lastUpdated);
    const now = new Date();
    const diffMs = now.getTime() - lastUpdate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins === 1) return "1 minute ago";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "1 hour ago";
    return `${diffHours} hours ago`;
  };
  
  const getSeverityBadgeClass = (severity: string) => {
    switch(severity) {
      case "critical": return "bg-red-500 text-white";
      case "serious": return "bg-orange-500 text-white";
      case "stable": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case "pending": return "bg-yellow-500 text-white";
      case "accepted": return "bg-blue-500 text-white";
      case "en-route": return "bg-purple-500 text-white";
      case "arrived": return "bg-green-500 text-white";
      case "completed": return "bg-gray-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };
  
  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else {
      const diffHours = Math.round(diffMins / 60);
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
  };

  return (
    <DashboardLayout title="Hospital Dashboard" role="hospital">
      <div className="space-y-8 p-2 pb-8">
        <div className="grid gap-5 md:grid-cols-3">
          <Card className="rounded-xl overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
            <CardHeader className="pb-2 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.pendingCount}
                </CardTitle>
                <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600 dark:text-amber-300" />
                </div>
              </div>
              <CardDescription className="text-amber-700 dark:text-amber-300">Pending Requests</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-amber-500 text-sm flex items-center gap-1">
                <span>Awaiting your response</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-xl overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
            <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.activeCount}
                </CardTitle>
                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                  <Clipboard className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
              </div>
              <CardDescription className="text-blue-700 dark:text-blue-300">Active Cases</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-blue-500 text-sm flex items-center gap-1">
                <span>En route or arrived</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="rounded-xl overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
            <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">{stats.availableBeds}</CardTitle>
                <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-5 w-5 text-green-600 dark:text-green-300">
                    <path d="M3 14h18M3 14v3m18-3v3M5 9V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"></path>
                    <path d="M10 9H6m4 0h4m4 0h-4m-8 0V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4M9 18v3m6-3v3"></path>
                  </svg>
                </div>
              </div>
              <CardDescription className="text-green-700 dark:text-green-300">Available Beds</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-green-500 text-sm flex items-center gap-1">
                <span>Ready to receive patients</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="w-full sm:w-auto flex overflow-x-auto p-1 bg-gray-100 dark:bg-gray-800 rounded-full h-14">
            <TabsTrigger value="pending" className="rounded-full flex items-center space-x-2 px-5 h-12">
              <Clock className="h-4 w-4" />
              <span>Pending</span>
            </TabsTrigger>
            <TabsTrigger value="active" className="rounded-full flex items-center space-x-2 px-5 h-12">
              <Clipboard className="h-4 w-4" />
              <span>Active</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-full flex items-center space-x-2 px-5 h-12">
              <Calendar className="h-4 w-4" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Pending Requests</h2>
              <Badge variant="outline" className="font-normal bg-yellow-50 text-yellow-700 border-yellow-200 px-3 py-1">
                {pendingCases.length} pending
              </Badge>
            </div>
            
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : pendingCases.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Clock className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  No pending emergency requests at the moment.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {pendingCases.map(emergency => (
                  <Card key={emergency.id} className="rounded-xl overflow-hidden border-0 shadow-md bg-white dark:bg-gray-800">
                    <div className="h-2 bg-yellow-400"></div>
                    <CardHeader>
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-800 flex items-center justify-center text-yellow-600 dark:text-yellow-300">
                            {emergency.patientName?.charAt(0) || 'P'}
                          </div>
                          <div>
                            <CardTitle>{emergency.patientName}</CardTitle>
                            <CardDescription>
                              Case #{emergency.id.substring(0, 6)} • {formatTimestamp(emergency.createdAt)}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getSeverityBadgeClass(emergency.severity)}>
                            {emergency.severity.charAt(0).toUpperCase() + emergency.severity.slice(1)}
                          </Badge>
                          <Badge className={getStatusBadgeClass(emergency.status)}>
                            {emergency.status.charAt(0).toUpperCase() + emergency.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Patient</p>
                          <p className="font-medium">{emergency.patientName}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Age/Gender</p>
                          <p className="font-medium">{emergency.age} / {emergency.gender.charAt(0).toUpperCase() + emergency.gender.slice(1)}</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Symptoms/Condition</p>
                        <p className="text-sm">{emergency.symptoms}</p>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-3 border-t p-4 bg-gray-50 dark:bg-gray-900">
                      <Button 
                        variant="outline" 
                        className="rounded-full border-red-200 hover:bg-red-50 text-red-700 flex items-center gap-1 px-4"
                        onClick={() => handleRejectCase(emergency.id)}
                      >
                        <X className="h-4 w-4" />
                        <span>Reject</span>
                      </Button>
                      <Button 
                        className="rounded-full bg-green-600 hover:bg-green-700 flex items-center gap-1 px-4"
                        onClick={() => handleAcceptCase(emergency.id)}
                      >
                        <Check className="h-4 w-4" />
                        <span>Accept</span>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="active" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Active Cases</h2>
              <Badge variant="outline" className="font-normal bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                {activeCases.length} active
              </Badge>
            </div>
            
            {activeCases.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Clipboard className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  No active cases at the moment
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {activeCases.map(emergency => (
                  <Card 
                    key={emergency.id} 
                    className="rounded-xl overflow-hidden border-0 shadow-md bg-white dark:bg-gray-800"
                  >
                    <div className={`h-2 ${
                      emergency.status === "en-route" ? "bg-purple-500" : 
                      emergency.status === "arrived" ? "bg-green-500" : 
                      "bg-blue-500"
                    }`}></div>
                    <CardHeader>
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white ${
                            emergency.status === "en-route" ? "bg-purple-500" : 
                            emergency.status === "arrived" ? "bg-green-500" : 
                            "bg-blue-500"
                          }`}>
                            {emergency.patientName?.charAt(0) || 'P'}
                          </div>
                          <div>
                            <CardTitle>{emergency.patientName}</CardTitle>
                            <CardDescription>
                              Case #{emergency.id.substring(0, 6)} • {formatTimestamp(emergency.createdAt)}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getSeverityBadgeClass(emergency.severity)}>
                            {emergency.severity.charAt(0).toUpperCase() + emergency.severity.slice(1)}
                          </Badge>
                          <Badge className={getStatusBadgeClass(emergency.status)}>
                            {emergency.status.charAt(0).toUpperCase() + emergency.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Patient</p>
                          <p className="font-medium">{emergency.patientName}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Age/Gender</p>
                          <p className="font-medium">{emergency.age} / {emergency.gender.charAt(0).toUpperCase() + emergency.gender.slice(1)}</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Symptoms/Condition</p>
                        <p className="text-sm">{emergency.symptoms}</p>
                      </div>
                      
                      {emergency.ambulanceInfo && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                          <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-3">Ambulance Information</h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                              <p className="text-xs text-blue-700 dark:text-blue-400">Driver</p>
                              <p className="text-sm font-medium">{emergency.ambulanceInfo.driver}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                              <p className="text-xs text-blue-700 dark:text-blue-400">Vehicle</p>
                              <p className="text-sm font-medium">{emergency.ambulanceInfo.vehicleNumber}</p>
                            </div>
                          </div>
                          
                          {emergency.status === "en-route" && ambulanceLocations[emergency.ambulanceId || ''] && (
                            <div className="mt-3 bg-white dark:bg-gray-800 p-3 rounded-lg border-l-4 border-purple-500">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-xs text-purple-700 dark:text-purple-400">Live ETA</p>
                                  <p className="text-sm font-medium">{emergency.ambulanceInfo.estimatedArrival || "Calculating..."}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Last update</p>
                                  <p className="text-xs text-gray-500">
                                    {getTimeSinceUpdate(ambulanceLocations[emergency.ambulanceId || ''].lastUpdated)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {emergency.status !== "en-route" && (
                            <div className="mt-3 bg-white dark:bg-gray-800 p-3 rounded-lg">
                              <p className="text-xs text-blue-700 dark:text-blue-400">Status</p>
                              <p className="text-sm font-medium">
                                {emergency.status === "arrived" ? 
                                  "Ambulance has arrived" : 
                                  emergency.ambulanceInfo.estimatedArrival || "Preparing for transport"}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-3 border-t p-4 bg-gray-50 dark:bg-gray-900">
                      {emergency.status === "en-route" && emergency.ambulanceId && (
                        <Button variant="outline" className="rounded-full" onClick={() => openAmbulanceTracker(emergency)}>
                          Track Ambulance
                        </Button>
                      )}
                      <Button className="rounded-full">
                        Prepare Reception
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Case History</h2>
              <Badge variant="outline" className="font-normal bg-gray-50 text-gray-700 border-gray-200 px-3 py-1">
                {historyCases.length} completed
              </Badge>
            </div>
            
            {historyCases.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-10 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Calendar className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  No case history available
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {historyCases.map(emergency => (
                  <Card key={emergency.id} className="rounded-xl overflow-hidden border-0 shadow-md bg-white dark:bg-gray-800">
                    <div className="h-2 bg-gray-400"></div>
                    <CardHeader>
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                            {emergency.patientName?.charAt(0) || 'P'}
                          </div>
                          <div>
                            <CardTitle>{emergency.patientName}</CardTitle>
                            <CardDescription>
                              Case #{emergency.id.substring(0, 6)} • {formatTimestamp(emergency.createdAt)}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getSeverityBadgeClass(emergency.severity)}>
                            {emergency.severity.charAt(0).toUpperCase() + emergency.severity.slice(1)}
                          </Badge>
                          <Badge className="bg-gray-500 text-white">
                            Completed
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Patient</p>
                          <p className="font-medium">{emergency.patientName}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Age/Gender</p>
                          <p className="font-medium">{emergency.age} / {emergency.gender.charAt(0).toUpperCase() + emergency.gender.slice(1)}</p>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Symptoms/Condition</p>
                        <p className="text-sm">{emergency.symptoms}</p>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-3 border-t p-4 bg-gray-50 dark:bg-gray-900">
                      <Button variant="outline" className="rounded-full">
                        View Full Case Details
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default HospitalDashboard;
