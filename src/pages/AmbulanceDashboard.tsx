
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
import { AlertCircle, MapPin, Phone } from "lucide-react";
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
      <div className="space-y-6">
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center h-40">
              <p>Loading...</p>
            </CardContent>
          </Card>
        ) : !activeCase ? (
          <Card>
            <CardHeader>
              <CardTitle>New Emergency Case</CardTitle>
              <CardDescription>
                Enter patient information to request hospital assistance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patientName">Patient Name</Label>
                <Input
                  id="patientName"
                  placeholder="Enter patient name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="patientAge">Age</Label>
                  <Input
                    id="patientAge"
                    type="number"
                    placeholder="Patient's age"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="patientGender">Gender</Label>
                  <Select 
                    value={patientGender} 
                    onValueChange={setPatientGender}
                  >
                    <SelectTrigger id="patientGender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="symptoms">Symptoms/Condition</Label>
                <Textarea
                  id="symptoms"
                  placeholder="Describe the patient's symptoms and condition"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="severity">Severity</Label>
                <Select 
                  value={severity} 
                  onValueChange={(value) => setSeverity(value as any)}
                >
                  <SelectTrigger id="severity">
                    <SelectValue placeholder="Select severity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="serious">Serious</SelectItem>
                    <SelectItem value="stable">Stable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSubmitCase} 
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? "Submitting..." : "Submit Emergency Case"}
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="border-t-4 border-t-emergency-ambulance">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>Active Emergency Case</CardTitle>
                    <CardDescription>
                      Case #{activeCase.id.substring(0, 6)}
                    </CardDescription>
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
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Patient</p>
                    <p className="font-medium">{activeCase.patientName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Age/Gender</p>
                    <p className="font-medium">{activeCase.age} / {activeCase.gender.charAt(0).toUpperCase() + activeCase.gender.slice(1)}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Symptoms</p>
                  <p>{activeCase.symptoms}</p>
                </div>
                
                {activeCase.hospital && (
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                    <h3 className="font-semibold text-blue-800 mb-2">Hospital Information</h3>
                    <p className="text-blue-900 font-medium">{activeCase.hospital.name}</p>
                    <div className="flex items-center text-blue-700 text-sm gap-1 mt-1">
                      <MapPin className="h-4 w-4" />
                      <p>{activeCase.hospital.address}</p>
                    </div>
                    <div className="flex items-center text-blue-700 text-sm gap-1">
                      <Phone className="h-4 w-4" />
                      <p>{activeCase.hospital.contact}</p>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">Distance: {activeCase.hospital.distance}</p>
                    
                    <div className="flex items-center mt-4 space-x-3">
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeCase.hospital.address)}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button variant="outline" className="w-full">
                          Open Google Maps
                        </Button>
                      </a>
                      
                      {activeCase.status === "accepted" && (
                        <Button 
                          className="flex-1"
                          onClick={handleMarkEnRoute}
                        >
                          Mark En Route
                        </Button>
                      )}
                      
                      {activeCase.status === "en-route" && (
                        <Button 
                          className="flex-1"
                          onClick={handleMarkArrived}
                        >
                          Mark Arrived
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              
              {activeCase.status === "arrived" && (
                <CardFooter>
                  <div className="bg-green-50 p-3 rounded-md border border-green-100 w-full">
                    <p className="text-green-800 text-center">
                      Patient has been successfully delivered to the hospital. This case will be archived.
                    </p>
                  </div>
                </CardFooter>
              )}
            </Card>
            
            {showHospitals && (
              <Card>
                <CardHeader>
                  <CardTitle>Nearby Hospitals</CardTitle>
                  <CardDescription>
                    Select a hospital to transport the patient
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hospitals.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      Loading hospitals...
                    </div>
                  ) : (
                    hospitals.map(hospital => (
                      <div key={hospital.id} className="border rounded-md p-4 flex flex-col md:flex-row justify-between gap-4">
                        <div>
                          <h3 className="font-semibold">{hospital.name}</h3>
                          <div className="flex items-center text-gray-600 text-sm gap-1 mt-1">
                            <MapPin className="h-4 w-4" />
                            <p>{hospital.address}</p>
                          </div>
                          <div className="flex items-center text-gray-600 text-sm gap-1">
                            <Phone className="h-4 w-4" />
                            <p>{hospital.contact}</p>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm">
                            <span className="text-gray-700">Distance: {hospital.distance}</span>
                            <span className="text-gray-700">Available Beds: {hospital.beds}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center md:items-start">
                          <Button 
                            variant="outline" 
                            className="w-full md:w-auto"
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
