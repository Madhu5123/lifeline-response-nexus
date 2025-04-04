
// User roles 
export type UserRole = "admin" | "ambulance" | "hospital" | "police" | "unverified";

// User status
export type UserStatus = "pending" | "approved" | "rejected";

// User details interface
export interface UserDetails {
  organization?: string;
  address?: string;
  phone?: string;
  licenseNumber?: string;
  position?: string;
  imageUrls?: Record<string, string>;
  [key: string]: any;
}

// User interface
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  details?: UserDetails;
}

// Emergency case types
export type CaseStatus = "pending" | "accepted" | "completed" | "canceled" | "en-route" | "arrived";
export type CasePriority = "low" | "medium" | "high" | "critical";
export type CaseType = "accident" | "fire" | "medical" | "crime" | "other";

// Emergency case interface
export interface EmergencyCase {
  id: string;
  type: CaseType;
  priority: CasePriority;
  status: CaseStatus;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  description: string;
  reportedBy: {
    id: string;
    name: string;
    role?: UserRole;
  };
  assignedTo?: {
    id: string;
    name: string;
    role: UserRole;
  };
  hospitalId?: string;
  hospital?: {
    id: string;
    name: string;
    address: string;
    contact: string;
  };
  policeId?: string;
  ambulanceId?: string;
  ambulanceInfo?: {
    id: string;
    driver: string;
    vehicleNumber: string;
  };
  patientName?: string;
  age?: number;
  gender?: string;
  symptoms?: string;
  severity?: string; // Additional field for severity
  createdAt: string;
  updatedAt: string;
  images?: string[];
}

// Hospital interface
export interface Hospital extends User {
  details: UserDetails & {
    beds: {
      total: number;
      available: number;
    };
    specialties: string[];
    emergencyServices: boolean;
    contactInfo: {
      phone: string;
      email: string;
    };
    address?: string;
    contact?: string;
    distance?: string;
  };
}

// Ambulance interface
export interface Ambulance extends User {
  details: UserDetails & {
    vehicleId: string;
    vehicleType: string;
    capacity: number;
    equipment: string[];
    status: "available" | "busy" | "offline" | "en-route" | "idle";
    location?: {
      latitude: number;
      longitude: number;
      lastUpdated: string;
      address?: string;
    };
    vehicleNumber?: string;
    driverName?: string;
    severity?: string; 
    destination?: {
      name: string;
      eta: string;
    };
    caseId?: string;
    isNearby?: boolean;
    lastUpdated?: Date;
    distance?: string;
  };
}

// Police interface
export interface Police extends User {
  details: UserDetails & {
    badgeNumber: string;
    department: string;
    rank: string;
    status: "on-duty" | "off-duty";
    location?: {
      latitude: number;
      longitude: number;
      lastUpdated: string;
    };
  };
}

// Notification interface
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "alert" | "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: string;
  relatedTo?: {
    type: "case" | "user" | "system";
    id: string;
  };
}
