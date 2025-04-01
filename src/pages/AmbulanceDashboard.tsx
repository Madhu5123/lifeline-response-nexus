
import React, { useState } from "react";
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

// Mock hospital for demo
interface Hospital {
  id: string;
  name: string;
  address: string;
  contact: string;
  distance: string;
  beds: number;
}

const mockHospitals: Hospital[] = [
  {
    id: "hosp-1",
    name: "General City Hospital",
    address: "123 Medical Center Blvd, City Center",
    contact: "555-987-6543",
    distance: "2.3 miles",
    beds: 12,
  },
  {
    id: "hosp-2",
    name: "County Memorial Hospital",
    address: "456 Healthcare Ave, North Side",
    contact: "555-456-7890",
    distance: "4.1 miles",
    beds: 8,
  },
  {
    id: "hosp-3",
    name: "Riverside Medical Center",
    address: "789 Riverside Dr, East District",
    contact: "555-321-9876",
    distance: "5.8 miles",
    beds: 15,
  },
];

// Patient emergency case interface
interface PatientCase {
  id: string;
  patientName: string;
  age: number;
  gender: string;
  symptoms: string;
  severity: "critical" | "serious" | "stable";
  status: "pending" | "accepted" | "en-route" | "arrived";
  acceptedHospital?: Hospital;
  createdAt: Date;
}

const AmbulanceDashboard: React.FC = () => {
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState<"critical" | "serious" | "stable" | "">("");
  
  const [activeCase, setActiveCase] = useState<PatientCase | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHospitals, setShowHospitals] = useState(false);
  
  const { toast } = useToast();
  
  const handleSubmitCase = () => {
    if (!patientName || !patientAge || !patientGender || !symptoms || !severity) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please fill in all required fields.",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const newCase: PatientCase = {
        id: `case-${Date.now()}`,
        patientName,
        age: parseInt(patientAge),
        gender: patientGender,
        symptoms,
        severity: severity as "critical" | "serious" | "stable",
        status: "pending",
        createdAt: new Date(),
      };
      
      setActiveCase(newCase);
      setShowHospitals(true);
      setIsSubmitting(false);
      
      toast({
        title: "Emergency case submitted",
        description: "Your case has been sent to nearby hospitals.",
      });
      
      // Reset form
      setPatientName("");
      setPatientAge("");
      setPatientGender("");
      setSymptoms("");
      setSeverity("");
    }, 1500);
  };
  
  const handleAcceptHospital = (hospital: Hospital) => {
    if (!activeCase) return;
    
    setActiveCase({
      ...activeCase,
      status: "accepted",
      acceptedHospital: hospital,
    });
    
    setShowHospitals(false);
    
    toast({
      title: "Hospital confirmed",
      description: `${hospital.name} has accepted the patient. Proceed to the hospital.`,
    });
  };
  
  const handleMarkEnRoute = () => {
    if (!activeCase) return;
    
    setActiveCase({
      ...activeCase,
      status: "en-route",
    });
    
    toast({
      title: "Status updated",
      description: "You are now en route to the hospital.",
    });
  };
  
  const handleMarkArrived = () => {
    if (!activeCase) return;
    
    setActiveCase({
      ...activeCase,
      status: "arrived",
    });
    
    toast({
      title: "Arrived at hospital",
      description: "You have arrived at the hospital with the patient.",
    });
    
    // After 5 seconds, reset the active case for demo purposes
    setTimeout(() => {
      setActiveCase(null);
    }, 5000);
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
        {!activeCase ? (
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
                      Case #{activeCase.id.split('-')[1]}
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
                
                {activeCase.acceptedHospital && (
                  <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                    <h3 className="font-semibold text-blue-800 mb-2">Hospital Information</h3>
                    <p className="text-blue-900 font-medium">{activeCase.acceptedHospital.name}</p>
                    <div className="flex items-center text-blue-700 text-sm gap-1 mt-1">
                      <MapPin className="h-4 w-4" />
                      <p>{activeCase.acceptedHospital.address}</p>
                    </div>
                    <div className="flex items-center text-blue-700 text-sm gap-1">
                      <Phone className="h-4 w-4" />
                      <p>{activeCase.acceptedHospital.contact}</p>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">Distance: {activeCase.acceptedHospital.distance}</p>
                    
                    <div className="flex items-center mt-4 space-x-3">
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activeCase.acceptedHospital.address)}`} 
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
                  {mockHospitals.map(hospital => (
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
                  ))}
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
