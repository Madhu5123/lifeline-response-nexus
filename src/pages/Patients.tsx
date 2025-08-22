import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar as CalendarIcon, Filter, User, Clock, MapPin, Ambulance } from "lucide-react";
import { useAuth } from "@/contexts/RealtimeAuthContext";
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  ref,
  onValue,
  off,
  query,
  orderByChild,
  equalTo
} from "firebase/database";
import { db } from "@/lib/firebase";

interface Patient {
  id: string;
  patientName: string;
  age: number;
  gender: string;
  symptoms: string;
  severity: string;
  description: string;
  ambulanceInfo?: {
    id: string;
    driver: string;
    vehicleNumber: string;
    driverName: string;
  };
  location?: {
    address: string;
    latitude: number;
    longitude: number;
  };
  hospitalId: string;
  hospitalName: string;
  preparedAt: string;
  status: string;
  estimatedArrival?: string;
}

const Patients: React.FC = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const patientsRef = query(
      ref(db, "patients"),
      orderByChild("hospitalId"),
      equalTo(user.id)
    );
    
    const unsubscribe = onValue(patientsRef, (snapshot) => {
      if (snapshot.exists()) {
        const patientsData = snapshot.val();
        const patientsArray = Object.keys(patientsData).map(key => ({
          id: key,
          ...patientsData[key]
        }));
        
        // Sort by preparedAt date (newest first)
        patientsArray.sort((a, b) => new Date(b.preparedAt).getTime() - new Date(a.preparedAt).getTime());
        
        setPatients(patientsArray);
      } else {
        setPatients([]);
      }
      setLoading(false);
    });

    return () => off(patientsRef, "value", unsubscribe);
  }, [user?.id]);

  useEffect(() => {
    let filtered = patients;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(patient =>
        patient.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.symptoms.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.ambulanceInfo?.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.ambulanceInfo?.driverName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(patient => patient.status === statusFilter);
    }

    // Severity filter
    if (severityFilter !== "all") {
      filtered = filtered.filter(patient => patient.severity === severityFilter);
    }

    // Date filter
    if (dateFilter) {
      const filterDate = startOfDay(dateFilter);
      const filterEndDate = endOfDay(dateFilter);
      filtered = filtered.filter(patient => {
        const patientDate = parseISO(patient.preparedAt);
        return isAfter(patientDate, filterDate) && isBefore(patientDate, filterEndDate);
      });
    }

    setFilteredPatients(filtered);
  }, [patients, searchTerm, statusFilter, severityFilter, dateFilter]);

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "bg-red-500 hover:bg-red-600";
      case "high":
        return "bg-orange-500 hover:bg-orange-600";
      case "medium":
        return "bg-yellow-500 hover:bg-yellow-600";
      case "low":
        return "bg-green-500 hover:bg-green-600";
      default:
        return "bg-gray-500 hover:bg-gray-600";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "prepared":
        return "bg-blue-500 hover:bg-blue-600";
      case "arrived":
        return "bg-green-500 hover:bg-green-600";
      case "in-treatment":
        return "bg-purple-500 hover:bg-purple-600";
      case "discharged":
        return "bg-gray-500 hover:bg-gray-600";
      default:
        return "bg-gray-400 hover:bg-gray-500";
    }
  };

  return (
    <DashboardLayout title="Patients" role="Hospital">
      <div className="space-y-6">
        {/* Search and Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter Patients
            </CardTitle>
            <CardDescription>
              Search by name, symptoms, or ambulance details. Filter by status, severity, or date.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {/* Search Input */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search patients, symptoms, ambulance..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="prepared">Prepared</SelectItem>
                  <SelectItem value="arrived">Arrived</SelectItem>
                  <SelectItem value="in-treatment">In Treatment</SelectItem>
                  <SelectItem value="discharged">Discharged</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Severity Filter */}
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Date Filter */}
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateFilter && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter ? format(dateFilter, "PPP") : "Filter by date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFilter}
                    onSelect={(date) => {
                      setDateFilter(date);
                      setShowCalendar(false);
                    }}
                    initialFocus
                  />
                  <div className="p-3 border-t">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setDateFilter(undefined);
                        setShowCalendar(false);
                      }}
                      className="w-full"
                    >
                      Clear Date
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Results Summary */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {filteredPatients.length} of {patients.length} patients
              </p>
              {(searchTerm || statusFilter !== "all" || severityFilter !== "all" || dateFilter) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setSeverityFilter("all");
                    setDateFilter(undefined);
                  }}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Patients List */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading patients...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No patients found</h3>
              <p className="text-muted-foreground">
                {patients.length === 0 
                  ? "No patients have been prepared for reception yet."
                  : "No patients match your current filters."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredPatients.map((patient) => (
              <Card key={patient.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{patient.patientName}</CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span>{patient.age} years • {patient.gender}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Prepared {format(parseISO(patient.preparedAt), "MMM dd, yyyy 'at' h:mm a")}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getSeverityBadgeClass(patient.severity)}>
                        {patient.severity}
                      </Badge>
                      <Badge className={getStatusBadgeClass(patient.status)}>
                        {patient.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Patient Information */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        Patient Information
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium">Symptoms:</span>
                          <p className="text-sm text-muted-foreground">{patient.symptoms}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Description:</span>
                          <p className="text-sm text-muted-foreground">{patient.description}</p>
                        </div>
                        {patient.location?.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{patient.location.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ambulance Information */}
                    {patient.ambulanceInfo && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                          <Ambulance className="h-4 w-4" />
                          Ambulance Information
                        </h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium">Driver:</span>
                            <p className="text-sm text-muted-foreground">{patient.ambulanceInfo.driverName}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium">Vehicle:</span>
                            <p className="text-sm text-muted-foreground">{patient.ambulanceInfo.vehicleNumber}</p>
                          </div>
                          {patient.estimatedArrival && (
                            <div>
                              <span className="text-sm font-medium">ETA:</span>
                              <p className="text-sm text-muted-foreground">{patient.estimatedArrival}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Patients;