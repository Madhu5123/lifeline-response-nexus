
import React, { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, MapPin, Phone } from "lucide-react";

// Mock ambulance interface
interface Ambulance {
  id: string;
  driverName: string;
  vehicleNumber: string;
  severity: "critical" | "serious" | "stable";
  status: "en-route" | "idle";
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  destination?: {
    name: string;
    address: string;
    eta: string;
  };
  isNearby: boolean;
  lastUpdated: Date;
}

// Mock active ambulances
const mockAmbulances: Ambulance[] = [
  {
    id: "amb-123",
    driverName: "John Ambulance",
    vehicleNumber: "AMB-7890",
    severity: "critical",
    status: "en-route",
    location: {
      latitude: 37.7749,
      longitude: -122.4194,
      address: "Market St & 5th St, San Francisco",
    },
    destination: {
      name: "General City Hospital",
      address: "123 Medical Center Blvd, City Center",
      eta: "4 minutes",
    },
    isNearby: true, // This ambulance is near the current police officer
    lastUpdated: new Date(Date.now() - 30000), // 30 seconds ago
  },
  {
    id: "amb-124",
    driverName: "Sarah Paramedic",
    vehicleNumber: "AMB-4567",
    severity: "serious",
    status: "en-route",
    location: {
      latitude: 37.7833,
      longitude: -122.4167,
      address: "Van Ness Ave & Geary Blvd, San Francisco",
    },
    destination: {
      name: "County Memorial Hospital",
      address: "456 Healthcare Ave, North Side",
      eta: "7 minutes",
    },
    isNearby: false,
    lastUpdated: new Date(Date.now() - 60000), // 1 minute ago
  },
  {
    id: "amb-125",
    driverName: "Mike Rescue",
    vehicleNumber: "AMB-1234",
    severity: "stable",
    status: "idle",
    location: {
      latitude: 37.7694,
      longitude: -122.4862,
      address: "19th Ave & Irving St, San Francisco",
    },
    isNearby: false,
    lastUpdated: new Date(Date.now() - 180000), // 3 minutes ago
  },
];

const PoliceDashboard: React.FC = () => {
  const [ambulances, setAmbulances] = useState(mockAmbulances);
  
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
              <div className="text-blue-500 text-sm">In your vicinity</div>
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
                  Real-time locations of emergency vehicles
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="aspect-video bg-gray-100 flex items-center justify-center border-t">
                  <div className="text-center p-8">
                    <p className="text-gray-500 mb-4">Map visualization would be implemented here</p>
                    <p className="text-sm text-gray-400">
                      This would display a Google Maps interface showing ambulance positions and routes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {ambulances.filter(a => a.isNearby).length > 0 && (
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
                          <Badge className={getSeverityBadgeClass(ambulance.severity)}>
                            {ambulance.severity.charAt(0).toUpperCase() + ambulance.severity.slice(1)}
                          </Badge>
                          <Badge className={getStatusBadgeClass(ambulance.status)}>
                            {ambulance.status === "en-route" ? "En Route" : "Idle"}
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
            {ambulances.map(ambulance => (
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
                        <Badge className="bg-blue-500 text-white">Nearby</Badge>
                      )}
                      <Badge className={getSeverityBadgeClass(ambulance.severity)}>
                        {ambulance.severity.charAt(0).toUpperCase() + ambulance.severity.slice(1)}
                      </Badge>
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
            ))}
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
                    <p className="font-medium">Ambulance AMB-7890 is in your vicinity</p>
                    <p className="text-sm text-gray-600">Transporting critical patient to General City Hospital</p>
                    <p className="text-xs text-gray-400">Today, 10:23 AM</p>
                  </div>
                  
                  <div className="border-l-4 border-l-red-500 pl-4 py-2">
                    <p className="font-medium">Emergency: Multi-vehicle accident reported</p>
                    <p className="text-sm text-gray-600">Highway 101, Northbound near Exit 432</p>
                    <p className="text-xs text-gray-400">Today, 9:15 AM</p>
                  </div>
                  
                  <div className="border-l-4 border-l-blue-500 pl-4 py-2">
                    <p className="font-medium">Ambulance AMB-4567 was in your vicinity</p>
                    <p className="text-sm text-gray-600">Transported serious patient to County Memorial Hospital</p>
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
