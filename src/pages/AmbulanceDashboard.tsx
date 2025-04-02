
import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, MapPin, Phone, Send, Clock, CheckCircle, User, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc, 
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { EmergencyCase, Hospital } from "@/models/types";

const AmbulanceDashboard: React.FC = () => {
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState<"critical" | "serious" | "stable" | "">("");
  
  const [activeCase, setActiveCase] = useState<EmergencyCase | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHospitals, setShowHospitals] = useState(false);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Fetch active case for the current ambulance driver
  useEffect(() => {
    if (!user) return;
    
    const fetchActiveCase = async () => {
      try {
        const casesRef = collection(db, "emergencyCases");
        const q = query(
          casesRef, 
          where("ambulanceId", "==", user.id),
          where("status", "in", ["pending", "accepted", "en-route"])
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            // Get the first active case
            const caseDoc = snapshot.docs[0];
            const caseData = caseDoc.data();
            
            setActiveCase({
              id: caseDoc.id,
              ...caseData,
              createdAt: caseData.createdAt?.toDate() || new Date(),
              updatedAt: caseData.updatedAt?.toDate() || new Date(),
            } as EmergencyCase);
            
            if (caseData.status === "accepted" && caseData.hospitalId) {
              setShowHospitals(false);
            } else if (caseData.status === "pending") {
              setShowHospitals(true);
              fetchHospitals();
            }
          } else {
            setActiveCase(null);
            setShowHospitals(false);
          }
          setLoading(false);
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error("Error fetching active case:", error);
        toast({
          title: "Error",
          description: "Failed to fetch active case",
          variant: "destructive",
        });
        setLoading(false);
      }
    };
    
    fetchActiveCase();
  }, [user, toast]);
  
  // Fetch hospitals
  const fetchHospitals = async () => {
    try {
      const hospitalsRef = collection(db, "hospitals");
      const querySnapshot = await getDocs(hospitalsRef);
      
      const hospitalsData: Hospital[] = [];
      querySnapshot.forEach((doc) => {
        hospitalsData.push({
          id: doc.id,
          ...doc.data(),
        } as Hospital);
      });
      
      setHospitals(hospitalsData);
    } catch (error) {
      console.error("Error fetching hospitals:", error);
      toast({
        title: "Error",
        description: "Failed to fetch nearby hospitals",
        variant: "destructive",
      });
    }
  };
  
  const handleSubmitCase = async () => {
    if (!user) return;
    
    if (!patientName || !patientAge || !patientGender || !symptoms || !severity) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please fill in all required fields.",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Create new emergency case in Firestore
      const caseRef = await addDoc(collection(db, "emergencyCases"), {
        patientName,
        age: parseInt(patientAge),
        gender: patientGender,
        symptoms,
        severity,
        status: "pending",
        ambulanceId: user.id,
        ambulanceInfo: {
          id: user.id,
          driverName: user.name,
          vehicleNumber: user.details?.licenseNumber || "Unknown",
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      // Create or update ambulance location
      await addDoc(collection(db, "ambulances"), {
        id: user.id,
        driverName: user.name,
        vehicleNumber: user.details?.licenseNumber || "Unknown",
        status: "en-route",
        severity,
        caseId: caseRef.id,
        location: {
          latitude: 37.7749, // Default coordinates - in a real app, use device GPS
          longitude: -122.4194,
          address: "Current Location", // In a real app, reverse geocode the coordinates
        },
        lastUpdated: serverTimestamp(),
      });
      
      toast({
        title: "Emergency case submitted",
        description: "Your case has been sent to nearby hospitals.",
      });
      
      // Fetch hospitals for selection
      fetchHospitals();
      setShowHospitals(true);
      
      // Reset form
      setPatientName("");
      setPatientAge("");
      setPatientGender("");
      setSymptoms("");
      setSeverity("");
    } catch (error) {
      console.error("Error submitting case:", error);
      toast({
        title: "Error",
        description: "Failed to submit emergency case",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAcceptHospital = async (hospital: Hospital) => {
    if (!activeCase) return;
    
    try {
      // Update the case in Firestore
      const caseRef = doc(db, "emergencyCases", activeCase.id);
      await updateDoc(caseRef, {
        status: "accepted",
        hospitalId: hospital.id,
        hospital: hospital,
        updatedAt: serverTimestamp(),
      });
      
      setShowHospitals(false);
      
      toast({
        title: "Hospital confirmed",
        description: `${hospital.name} has accepted the patient. Proceed to the hospital.`,
      });
    } catch (error) {
      console.error("Error accepting hospital:", error);
      toast({
        title: "Error",
        description: "Failed to confirm hospital selection",
        variant: "destructive",
      });
    }
  };
  
  const handleMarkEnRoute = async () => {
    if (!activeCase) return;
    
    try {
      // Update the case in Firestore
      const caseRef = doc(db, "emergencyCases", activeCase.id);
      await updateDoc(caseRef, {
        status: "en-route",
        updatedAt: serverTimestamp(),
      });
      
      // Update ambulance status
      const ambulancesRef = collection(db, "ambulances");
      const q = query(ambulancesRef, where("id", "==", user?.id));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const ambulanceDoc = snapshot.docs[0];
        await updateDoc(doc(db, "ambulances", ambulanceDoc.id), {
          status: "en-route",
          lastUpdated: serverTimestamp(),
        });
      }
      
      toast({
        title: "Status updated",
        description: "You are now en route to the hospital.",
      });
    } catch (error) {
      console.error("Error marking en-route:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };
  
  const handleMarkArrived = async () => {
    if (!activeCase) return;
    
    try {
      // Update the case in Firestore
      const caseRef = doc(db, "emergencyCases", activeCase.id);
      await updateDoc(caseRef, {
        status: "arrived",
        updatedAt: serverTimestamp(),
      });
      
      // Update ambulance status
      const ambulancesRef = collection(db, "ambulances");
      const q = query(ambulancesRef, where("id", "==", user?.id));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const ambulanceDoc = snapshot.docs[0];
        await updateDoc(doc(db, "ambulances", ambulanceDoc.id), {
          status: "idle",
          caseId: null,
          severity: null,
          destination: null,
          lastUpdated: serverTimestamp(),
        });
      }
      
      toast({
        title: "Arrived at hospital",
        description: "You have arrived at the hospital with the patient.",
      });
      
      // After 5 seconds, mark the case as completed
      setTimeout(async () => {
        try {
          await updateDoc(caseRef, {
            status: "completed",
            updatedAt: serverTimestamp(),
          });
          setActiveCase(null);
        } catch (error) {
          console.error("Error completing case:", error);
        }
      }, 5000);
    } catch (error) {
      console.error("Error marking arrived:", error);
      toast({
        title: "Error",
        description: "Failed to update status",
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
      default: return "bg-gray-500 text-white";
    }
  };

  return (
    <DashboardLayout title="Ambulance Dashboard" role="ambulance">
      <div className="space-y-8 p-2 pb-8">
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : !activeCase ? (
          <Card className="rounded-xl overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
            <CardHeader className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-b border-red-100 dark:border-red-800/20">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center">
                  <User className="h-6 w-6 text-red-600 dark:text-red-300" />
                </div>
                <div>
                  <CardTitle className="text-xl">New Emergency Case</CardTitle>
                  <CardDescription>
                    Enter patient information to request assistance
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="space-y-3">
                <Label htmlFor="patientName" className="text-sm font-medium">Patient Name</Label>
                <Input
                  id="patientName"
                  placeholder="Enter patient name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="rounded-xl h-12"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="patientAge" className="text-sm font-medium">Age</Label>
                  <Input
                    id="patientAge"
                    type="number"
                    placeholder="Patient's age"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    className="rounded-xl h-12"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="patientGender" className="text-sm font-medium">Gender</Label>
                  <Select 
                    value={patientGender} 
                    onValueChange={setPatientGender}
                  >
                    <SelectTrigger id="patientGender" className="rounded-xl h-12">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="symptoms" className="text-sm font-medium">Symptoms/Condition</Label>
                <Textarea
                  id="symptoms"
                  placeholder="Describe the patient's symptoms and condition"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={3}
                  className="rounded-xl resize-none"
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="severity" className="text-sm font-medium">Severity</Label>
                <Select 
                  value={severity} 
                  onValueChange={(value) => setSeverity(value as any)}
                >
                  <SelectTrigger id="severity" className="rounded-xl h-12">
                    <SelectValue placeholder="Select severity level" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="critical" className="text-red-600">Critical</SelectItem>
                    <SelectItem value="serious" className="text-orange-600">Serious</SelectItem>
                    <SelectItem value="stable" className="text-green-600">Stable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="bg-gray-50 dark:bg-gray-900 p-6">
              <Button 
                onClick={handleSubmitCase} 
                disabled={isSubmitting}
                className="w-full rounded-full h-12 text-base flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit Emergency Case"}
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="rounded-xl overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
              <div className="h-2 bg-emergency-ambulance"></div>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      activeCase.status === "pending" ? "bg-yellow-500" : 
                      activeCase.status === "accepted" ? "bg-blue-500" : 
                      activeCase.status === "en-route" ? "bg-purple-500" : 
                      "bg-green-500"
                    } text-white`}>
                      <FileText className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Active Emergency</CardTitle>
                      <CardDescription>
                        Case #{activeCase.id.substring(0, 6)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={getSeverityBadgeClass(activeCase.severity)}>
                      {activeCase.severity.charAt(0).toUpperCase() + activeCase.severity.slice(1)}
                    </Badge>
                    <Badge className={getStatusBadgeClass(activeCase.status)}>
                      {activeCase.status.charAt(0).toUpperCase() + activeCase.status.slice(1)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Patient</p>
                    <p className="font-medium">{activeCase.patientName}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Age/Gender</p>
                    <p className="font-medium">{activeCase.age} / {activeCase.gender.charAt(0).toUpperCase() + activeCase.gender.slice(1)}</p>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Symptoms</p>
                  <p className="text-sm">{activeCase.symptoms}</p>
                </div>
                
                {activeCase.hospital && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-5 w-5 text-blue-600 dark:text-blue-300">
                          <path d="M19 9h-5V4H8v5H3v8h5v5h6v-5h5V9z"></path>
                        </svg>
                      </div>
                      <h3 className="font-semibold text-blue-800 dark:text-blue-300 text-lg">Hospital Information</h3>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg mb-3">
                      <p className="text-blue-900 dark:text-blue-100 font-medium text-lg">{activeCase.hospital.name}</p>
                      <div className="flex items-center text-blue-700 dark:text-blue-300 text-sm gap-2 mt-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <p>{activeCase.hospital.address}</p>
                      </div>
                      <div className="flex items-center text-blue-700 dark:text-blue-300 text-sm gap-2 mt-1">
                        <Phone className="h-4 w-4 shrink-0" />
                        <p>{activeCase.hospital.contact}</p>
                      </div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                        <span className="font-medium">Distance:</span> {activeCase.hospital.distance}
                      </p>
                    </div>
                    
                    <div className="flex items-center mt-4 space-x-3">
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeCase.hospital.address)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button variant="outline" className="w-full rounded-full h-11">
                          Open Google Maps
                        </Button>
                      </a>
                      
                      {activeCase.status === "accepted" && (
                        <Button 
                          className="flex-1 rounded-full h-11 bg-purple-600 hover:bg-purple-700"
                          onClick={handleMarkEnRoute}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Mark En Route
                        </Button>
                      )}
                      
                      {activeCase.status === "en-route" && (
                        <Button 
                          className="flex-1 rounded-full h-11 bg-green-600 hover:bg-green-700"
                          onClick={handleMarkArrived}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Arrived
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              
              {activeCase.status === "arrived" && (
                <CardFooter className="bg-green-50 dark:bg-green-900/20 p-5 border-t border-green-100 dark:border-green-800">
                  <div className="flex items-center gap-3 w-full">
                    <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400 shrink-0" />
                    <p className="text-green-800 dark:text-green-200">
                      Patient has been successfully delivered to the hospital. This case will be archived.
                    </p>
                  </div>
                </CardFooter>
              )}
            </Card>
            
            {showHospitals && (
              <Card className="rounded-xl overflow-hidden border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-b border-blue-100 dark:border-blue-800/20">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-5 w-5 text-blue-600 dark:text-blue-300">
                        <path d="M19 9h-5V4H8v5H3v8h5v5h6v-5h5V9z"></path>
                      </svg>
                    </div>
                    <div>
                      <CardTitle>Nearby Hospitals</CardTitle>
                      <CardDescription>
                        Select a hospital to transport the patient
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 p-5">
                  {hospitals.length === 0 ? (
                    <div className="flex justify-center items-center p-8">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                  ) : (
                    hospitals.map(hospital => (
                      <div key={hospital.id} className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-5 w-5 text-blue-600 dark:text-blue-300">
                                <path d="M19 9h-5V4H8v5H3v8h5v5h6v-5h5V9z"></path>
                              </svg>
                            </div>
                            <h3 className="font-semibold text-lg">{hospital.name}</h3>
                          </div>
                          
                          <div className="ml-1">
                            <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm gap-2 mt-1">
                              <MapPin className="h-4 w-4 shrink-0" />
                              <p>{hospital.address}</p>
                            </div>
                            <div className="flex items-center text-gray-600 dark:text-gray-300 text-sm gap-2 mt-1">
                              <Phone className="h-4 w-4 shrink-0" />
                              <p>{hospital.contact}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 mt-3">
                              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg text-center">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Distance</p>
                                <p className="font-medium">{hospital.distance}</p>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded-lg text-center">
                                <p className="text-xs text-gray-500 dark:text-gray-400">Available Beds</p>
                                <p className="font-medium">{hospital.beds}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 dark:bg-gray-900 p-3 border-t border-gray-100 dark:border-gray-700">
                          <Button 
                            className="w-full rounded-full"
                            onClick={() => handleAcceptHospital(hospital)}
                          >
                            Select Hospital
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
        <Card className="rounded-xl overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-amber-50 text-amber-800 border-b border-amber-100 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/30 flex flex-row gap-3 items-start">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <CardTitle className="text-amber-800 dark:text-amber-200">Important Notice</CardTitle>
              <CardDescription className="text-amber-700 dark:text-amber-300">
                This is a demo version of the Lifeline Emergency Response app
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <p className="text-sm">
              In a real implementation, this would include:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li>GPS tracking of the ambulance</li>
              <li>Real-time communication with hospitals</li>
              <li>Automatic notification to police when en route</li>
              <li>Full integration with Google Maps for navigation</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AmbulanceDashboard;
