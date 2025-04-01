
import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Clock, X } from "lucide-react";
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
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">
                {stats.pendingCount}
              </CardTitle>
              <CardDescription>Pending Requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-amber-500 text-sm flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>Awaiting response</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">
                {stats.activeCount}
              </CardTitle>
              <CardDescription>Active Cases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-blue-500 text-sm flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>En route or arrived</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-bold">{stats.availableBeds}</CardTitle>
              <CardDescription>Available Beds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-green-500 text-sm flex items-center gap-1">
                <Check className="h-4 w-4" />
                <span>Ready to receive</span>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Pending Requests</TabsTrigger>
            <TabsTrigger value="active">Active Cases</TabsTrigger>
            <TabsTrigger value="history">Case History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  Loading pending emergency requests...
                </CardContent>
              </Card>
            ) : pendingCases.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  No pending emergency requests
                </CardContent>
              </Card>
            ) : (
              pendingCases.map(emergency => (
                <Card key={emergency.id} className="border-l-4 border-l-yellow-500">
                  <CardHeader>
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <CardTitle>{emergency.patientName}</CardTitle>
                        <CardDescription>
                          Case #{emergency.id.substring(0, 6)} • {formatTimestamp(emergency.createdAt)}
                        </CardDescription>
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
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Patient</p>
                        <p className="font-medium">{emergency.patientName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Age/Gender</p>
                        <p className="font-medium">{emergency.age} / {emergency.gender.charAt(0).toUpperCase() + emergency.gender.slice(1)}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Symptoms/Condition</p>
                      <p>{emergency.symptoms}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2 border-t p-4">
                    <Button 
                      variant="outline" 
                      className="border-red-200 hover:bg-red-50 text-red-700"
                      onClick={() => handleRejectCase(emergency.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject Request
                    </Button>
                    <Button 
                      onClick={() => handleAcceptCase(emergency.id)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Accept Patient
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="active" className="space-y-4">
            {activeCases.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  No active cases at the moment
                </CardContent>
              </Card>
            ) : (
              activeCases.map(emergency => (
                <Card 
                  key={emergency.id} 
                  className={`border-l-4 ${
                    emergency.status === "en-route" ? "border-l-purple-500" : 
                    emergency.status === "arrived" ? "border-l-green-500" : 
                    "border-l-blue-500"
                  }`}
                >
                  <CardHeader>
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <CardTitle>{emergency.patientName}</CardTitle>
                        <CardDescription>
                          Case #{emergency.id.substring(0, 6)} • {formatTimestamp(emergency.createdAt)}
                        </CardDescription>
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
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Patient</p>
                        <p className="font-medium">{emergency.patientName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Age/Gender</p>
                        <p className="font-medium">{emergency.age} / {emergency.gender.charAt(0).toUpperCase() + emergency.gender.slice(1)}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Symptoms/Condition</p>
                      <p>{emergency.symptoms}</p>
                    </div>
                    
                    {emergency.ambulanceInfo && (
                      <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
                        <h3 className="font-medium text-blue-800 mb-2">Ambulance Information</h3>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-blue-700">Driver</p>
                            <p className="text-sm">{emergency.ambulanceInfo.driverName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-blue-700">Vehicle</p>
                            <p className="text-sm">{emergency.ambulanceInfo.vehicleNumber}</p>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-blue-700">ETA</p>
                          <p className="text-sm font-medium">{emergency.ambulanceInfo.estimatedArrival || "Calculating..."}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2 border-t p-4">
                    <Button variant="outline">
                      Contact Ambulance
                    </Button>
                    <Button>
                      Prepare Reception
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            {historyCases.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-gray-500">
                  No case history available
                </CardContent>
              </Card>
            ) : (
              historyCases.map(emergency => (
                <Card key={emergency.id} className="border-l-4 border-l-gray-400">
                  <CardHeader>
                    <div className="flex flex-wrap justify-between items-start gap-2">
                      <div>
                        <CardTitle>{emergency.patientName}</CardTitle>
                        <CardDescription>
                          Case #{emergency.id.substring(0, 6)} • {formatTimestamp(emergency.createdAt)}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getSeverityBadgeClass(emergency.severity)}>
                          {emergency.severity.charAt(0).toUpperCase() + emergency.severity.slice(1)}
                        </Badge>
                        <Badge className={getStatusBadgeClass(emergency.status)}>
                          Completed
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Patient</p>
                        <p className="font-medium">{emergency.patientName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Age/Gender</p>
                        <p className="font-medium">{emergency.age} / {emergency.gender.charAt(0).toUpperCase() + emergency.gender.slice(1)}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Symptoms/Condition</p>
                      <p>{emergency.symptoms}</p>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2 border-t p-4">
                    <Button variant="outline">
                      View Full Case Details
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default HospitalDashboard;
