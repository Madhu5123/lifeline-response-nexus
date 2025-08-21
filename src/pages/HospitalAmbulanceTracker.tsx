import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Clock, User, Phone } from "lucide-react";
import AmbulanceTrackingMap from "@/components/AmbulanceTrackingMap";
import { ref, onValue, off } from "firebase/database";
import { db } from "@/lib/firebase";
import { EmergencyCase, Ambulance } from "@/models/types";
import { useAuth } from "@/contexts/RealtimeAuthContext";
import { useToast } from "@/hooks/use-toast";

const HospitalAmbulanceTracker: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [emergencyCase, setEmergencyCase] = useState<EmergencyCase | null>(null);
  const [ambulance, setAmbulance] = useState<Ambulance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!caseId) {
      toast({
        title: "Error",
        description: "Case ID not found",
        variant: "destructive",
      });
      navigate("/hospital");
      return;
    }

    // Fetch emergency case details
    const caseRef = ref(db, `emergencyCases/${caseId}`);
    const caseUnsubscribe = onValue(caseRef, (snapshot) => {
      const caseData = snapshot.val();
      if (caseData) {
        setEmergencyCase({
          id: caseId,
          ...caseData
        });

        // If we have an ambulance ID, fetch ambulance details
        if (caseData.ambulanceId) {
          const ambulanceRef = ref(db, `ambulances/${caseData.ambulanceId}`);
          const ambulanceUnsubscribe = onValue(ambulanceRef, (ambulanceSnapshot) => {
            const ambulanceData = ambulanceSnapshot.val();
            if (ambulanceData) {
              setAmbulance({
                id: caseData.ambulanceId,
                name: ambulanceData.name || "",
                email: ambulanceData.email || "",
                role: "ambulance",
                status: "approved",
                details: {
                  vehicleId: ambulanceData.vehicleId || "",
                  vehicleType: ambulanceData.vehicleType || "Standard Ambulance",
                  capacity: ambulanceData.capacity || 2,
                  equipment: ambulanceData.equipment || [],
                  status: ambulanceData.status || "available",
                  driverName: ambulanceData.driverName,
                  vehicleNumber: ambulanceData.vehicleNumber,
                  severity: ambulanceData.severity,
                  location: ambulanceData.location,
                  destination: ambulanceData.destination,
                  caseId: ambulanceData.caseId,
                  lastUpdated: ambulanceData.lastUpdated ? new Date(ambulanceData.lastUpdated) : new Date(),
                }
              });
            }
            setLoading(false);
          });

          return () => off(ambulanceRef, "value", ambulanceUnsubscribe);
        } else {
          setLoading(false);
        }
      } else {
        toast({
          title: "Case not found",
          description: "The requested case could not be found",
          variant: "destructive",
        });
        navigate("/hospital");
      }
    });

    return () => off(caseRef, "value", caseUnsubscribe);
  }, [caseId, navigate, toast]);

  const getTimeSinceUpdate = (lastUpdated: Date | string) => {
    const lastUpdate = typeof lastUpdated === 'string' ? new Date(lastUpdated) : lastUpdated;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading ambulance tracking...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!emergencyCase || !ambulance) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="outline"
            onClick={() => navigate("/hospital")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <Card>
            <CardContent className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-gray-500">Ambulance tracking not available</p>
                <p className="text-sm text-gray-400 mt-2">Case or ambulance data could not be loaded</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/hospital")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ambulance Tracking</h1>
              <p className="text-gray-600">Real-time location monitoring</p>
            </div>
          </div>
          <Badge className={getStatusBadgeClass(emergencyCase.status)}>
            {emergencyCase.status.charAt(0).toUpperCase() + emergencyCase.status.slice(1)}
          </Badge>
        </div>

        {/* Case and Ambulance Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Case Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Patient</p>
                <p className="font-medium">{emergencyCase.patientName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Age / Gender</p>
                <p className="font-medium">{emergencyCase.age} / {emergencyCase.gender}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Severity</p>
                <Badge className={getSeverityBadgeClass(emergencyCase.severity)}>
                  {emergencyCase.severity.charAt(0).toUpperCase() + emergencyCase.severity.slice(1)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-sm">{emergencyCase.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Ambulance Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Ambulance Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Vehicle Number</p>
                <p className="font-medium">{ambulance.details.vehicleNumber || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Driver</p>
                <p className="font-medium">{ambulance.details.driverName || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Vehicle Type</p>
                <p className="font-medium">{ambulance.details.vehicleType}</p>
              </div>
              {ambulance.details.destination && (
                <div>
                  <p className="text-sm text-gray-500">Destination</p>
                  <p className="font-medium">{ambulance.details.destination.name}</p>
                  {ambulance.details.destination.eta && (
                    <p className="text-sm text-gray-500">ETA: {ambulance.details.destination.eta}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Location Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Location Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ambulance.details.location && (
                <>
                  <div>
                    <p className="text-sm text-gray-500">Last Update</p>
                    <p className="font-medium">
                      {getTimeSinceUpdate(ambulance.details.lastUpdated)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Coordinates</p>
                    <p className="text-sm font-mono">
                      {ambulance.details.location.latitude.toFixed(6)}, {ambulance.details.location.longitude.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      Tracking Active
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <AmbulanceTrackingMap 
          ambulances={[ambulance]}
          policeLocation={user?.details?.location ? {
            latitude: user.details.location.latitude,
            longitude: user.details.location.longitude
          } : undefined}
        />
      </div>
    </div>
  );
};

export default HospitalAmbulanceTracker;