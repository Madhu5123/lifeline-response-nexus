
// Common Types for the application

// User related types
export type UserRole = "admin" | "ambulance" | "hospital" | "police" | "unverified";

export interface UserDetails {
  organization?: string;
  address?: string;
  phone?: string;
  licenseNumber?: string;
  position?: string;
  [key: string]: any;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "pending" | "approved" | "rejected";
  details?: UserDetails;
}

// Emergency Case related types
export type CaseSeverity = "critical" | "serious" | "stable";
export type CaseStatus = "pending" | "accepted" | "en-route" | "arrived" | "completed";

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface Destination {
  name: string;
  address: string;
  eta: string;
}

export interface AmbulanceInfo {
  id: string;
  driverName: string;
  vehicleNumber: string;
  estimatedArrival: string;
  location?: Location;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  contact: string;
  distance: string;
  beds: number;
  location?: Location;
}

export interface EmergencyCase {
  id: string;
  patientName: string;
  age: number;
  gender: string;
  symptoms: string;
  severity: CaseSeverity;
  status: CaseStatus;
  ambulanceId?: string;
  ambulanceInfo?: AmbulanceInfo;
  hospitalId?: string;
  hospital?: Hospital;
  location?: Location;
  createdAt: Date;
  updatedAt?: Date;
}

// Ambulance tracking related types
export interface Ambulance {
  id: string;
  driverName: string;
  vehicleNumber: string;
  severity?: CaseSeverity;
  status: "en-route" | "idle";
  location: Location;
  destination?: Destination;
  caseId?: string;
  isNearby?: boolean;
  lastUpdated: Date;
}
