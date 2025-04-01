
import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Clock, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Case interface
interface EmergencyCase {
  id: string;
  patientName: string;
  age: number;
  gender: string;
  symptoms: string;
  severity: "critical" | "serious" | "stable";
  status: "pending" | "accepted" | "en-route" | "arrived" | "completed";
  ambulanceInfo?: {
    id: string;
    driverName: string;
    vehicleNumber: string;
    estimatedArrival: string;
  };
  createdAt: Date;
}

// Mock active cases for demo
const mockPendingCases: EmergencyCase[] = [
  {
    id: "case-12345",
    patientName: "Robert Johnson",
    age: 67,
    gender: "male",
    symptoms: "Chest pain, shortness of breath, left arm pain. Possible heart attack.",
    severity: "critical",
    status: "pending",
    createdAt: new Date(Date.now() - 3 * 60000), // 3 minutes ago
  },
  {
    id: "case-12346",
    patientName: "Emily Davis",
    age: 34,
    gender: "female",
    symptoms: "Severe abdominal pain, vomiting. Possible appendicitis.",
    severity: "serious",
    status: "pending",
    createdAt: new Date(Date.now() - 5 * 60000), // 5 minutes ago
  },
  {
    id: "case-12347",
    patientName: "Thomas Wilson",
    age: 45,
    gender: "male",
    symptoms: "Deep laceration on right leg, significant bleeding but controlled with pressure.",
    severity: "stable",
    status: "pending",
    createdAt: new Date(Date.now() - 8 * 60000), // 8 minutes ago
  },
];

// Mock active cases that have been accepted
const mockActiveCases: EmergencyCase[] = [
  {
    id: "case-12340",
    patientName: "Maria Garcia",
    age: 78,
    gender: "female",
    symptoms: "Stroke symptoms - facial drooping, arm weakness, slurred speech.",
    severity: "critical",
    status: "en-route",
    ambulanceInfo: {
      id: "amb-123",
      driverName: "John Ambulance",
      vehicleNumber: "AMB-7890",
      estimatedArrival: "2 minutes",
    },
    createdAt: new Date(Date.now() - 15 * 60000), // 15 minutes ago
  },
];

// Previously completed cases
const mockHistoryCases: EmergencyCase[] = [
  {
    id: "case-12330",
    patientName: "James Smith",
    age: 55,
    gender: "male",
    symptoms: "Fractured femur from bicycle accident.",
    severity: "serious",
    status: "completed",
    ambulanceInfo: {
      id: "amb-122",
      driverName: "David Ambulance",
      vehicleNumber: "AMB-4567",
      estimatedArrival: "Arrived",
    },
    createdAt: new Date(Date.now() - 2 * 3600000), // 2 hours ago
  },
  {
    id: "case-12320",
    patientName: "Sofia Rodriguez",
    age: 8,
    gender: "female",
    symptoms: "High fever, rash, irritability.",
    severity: "stable",
    status: "completed",
    ambulanceInfo: {
      id: "amb-121",
      driverName: "John Ambulance",
      vehicleNumber: "AMB-7890",
      estimatedArrival: "Arrived",
    },
    createdAt: new Date(Date.now() - 5 * 3600000), // 5 hours ago
  },
];

const HospitalDashboard: React.FC = () => {
  const [pendingCases, setPendingCases] = useState(mockPendingCases);
  const [activeCases, setActiveCases] = useState(mockActiveCases);
  const [historyCases, setHistoryCases] = useState(mockHistoryCases);
  
  const { toast } = useToast();
  
  const handleAcceptCase = (caseId: string) => {
    // Find the case
    const caseToAccept = pendingCases.find(c => c.id === caseId);
    if (!caseToAccept) return;
    
    // Remove from pending
    setPendingCases(pendingCases.filter(c => c.id !== caseId));
    
    // Add to active cases with status updated
    setActiveCases([
      ...activeCases,
      {
        ...caseToAccept,
        status: "accepted",
        ambulanceInfo: {
          id: "amb-123",
          driverName: "John Ambulance",
          vehicleNumber: "AMB-7890",
          estimatedArrival: "12 minutes",
        },
      },
    ]);
    
    toast({
      title: "Case Accepted",
      description: `You have accepted case ${caseId} and ambulance has been notified.`,
    });
  };
  
  const handleRejectCase = (caseId: string) => {
    // Remove from pending cases
    setPendingCases(pendingCases.filter(c => c.id !== caseId));
    
    toast({
      title: "Case Rejected",
      description: `You have rejected case ${caseId}. Other hospitals will be notified.`,
    });
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
                {pendingCases.length}
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
                {activeCases.length}
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
              <CardTitle className="text-2xl font-bold">24</CardTitle>
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
            {pendingCases.length === 0 ? (
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
                          Case #{emergency.id.split('-')[1]} • {formatTimestamp(emergency.createdAt)}
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
                          Case #{emergency.id.split('-')[1]} • {formatTimestamp(emergency.createdAt)}
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
                          <p className="text-sm font-medium">{emergency.ambulanceInfo.estimatedArrival}</p>
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
            {historyCases.map(emergency => (
              <Card key={emergency.id} className="border-l-4 border-l-gray-400">
                <CardHeader>
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div>
                      <CardTitle>{emergency.patientName}</CardTitle>
                      <CardDescription>
                        Case #{emergency.id.split('-')[1]} • {formatTimestamp(emergency.createdAt)}
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
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default HospitalDashboard;
