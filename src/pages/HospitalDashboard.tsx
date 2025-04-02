
import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Clock, X, MapPin, Phone, AlertCircle, Calendar, Clipboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp,
  orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { EmergencyCase } from "@/models/types";

const HospitalDashboard: React.FC = () => {
  const [pendingCases, setPendingCases] = useState<EmergencyCase[]>([]);
  const [activeCases, setActiveCases] = useState<EmergencyCase[]>([]);
  const [historyCases, setHistoryCases] = useState<EmergencyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingCount: 0,
    activeCount: 0,
    availableBeds: 24, // Default value
  });
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Fetch pending cases
  useEffect(() => {
    if (!user) return;
    
    const fetchPendingCases = () => {
      try {
        const casesRef = collection(db, "emergencyCases");
        const q = query(
          casesRef, 
          where("status", "==", "pending"),
          orderBy("createdAt", "desc")
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const cases: EmergencyCase[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            cases.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
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
        
        return () => unsubscribe();
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
  
  // Fetch active cases for this hospital
  useEffect(() => {
    if (!user) return;
    
    const fetchActiveCases = () => {
      try {
        const casesRef = collection(db, "emergencyCases");
        const q = query(
          casesRef, 
          where("hospitalId", "==", user.id),
          where("status", "in", ["accepted", "en-route", "arrived"]),
          orderBy("updatedAt", "desc")
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const cases: EmergencyCase[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            cases.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
            } as EmergencyCase);
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
        
        return () => unsubscribe();
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
  }, [user, toast]);
  
  // Fetch case history for this hospital
  useEffect(() => {
    if (!user) return;
    
    const fetchHistoryCases = () => {
      try {
        const casesRef = collection(db, "emergencyCases");
        const q = query(
          casesRef, 
          where("hospitalId", "==", user.id),
          where("status", "==", "completed"),
          orderBy("updatedAt", "desc")
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const cases: EmergencyCase[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            cases.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
            } as EmergencyCase);
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
        
        return () => unsubscribe();
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
  
  const handleAcceptCase = async (caseId: string) => {
    if (!user) return;
    
    try {
      // Get the hospital details
      const hospitalData = {
        id: user.id,
        name: user.details?.organization || "Hospital",
        address: user.details?.address || "Hospital Address",
        contact: user.details?.phone || "Contact Number",
        distance: "Calculating...", // In a real app, calculate from coordinates
        beds: stats.availableBeds,
      };
      
      // Update the case in Firestore
      const caseRef = doc(db, "emergencyCases", caseId);
      await updateDoc(caseRef, {
        status: "accepted",
        hospitalId: user.id,
        hospital: hospitalData,
        updatedAt: serverTimestamp(),
      });
      
      // Update available beds
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
  
  const handleRejectCase = async (caseId: string) => {
    try {
      // In a real app, you might want to record the rejection reason
      // For now, we'll just remove this hospital from consideration
      
      toast({
        title: "Case Rejected",
        description: `You have rejected the case. Other hospitals will be notified.`,
      });
      
      // Remove this case from the pending list in the UI
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
  
  const formatTimestamp = (date: Date) => {
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
                              <p className="text-sm font-medium">{emergency.ambulanceInfo.driverName}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                              <p className="text-xs text-blue-700 dark:text-blue-400">Vehicle</p>
                              <p className="text-sm font-medium">{emergency.ambulanceInfo.vehicleNumber}</p>
                            </div>
                          </div>
                          <div className="mt-3 bg-white dark:bg-gray-800 p-3 rounded-lg">
                            <p className="text-xs text-blue-700 dark:text-blue-400">ETA</p>
                            <p className="text-sm font-medium">{emergency.ambulanceInfo.estimatedArrival || "Calculating..."}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-3 border-t p-4 bg-gray-50 dark:bg-gray-900">
                      <Button variant="outline" className="rounded-full">
                        Contact Ambulance
                      </Button>
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
