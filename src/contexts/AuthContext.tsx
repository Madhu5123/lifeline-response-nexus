
import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole = "admin" | "ambulance" | "hospital" | "police" | "unverified";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "pending" | "approved" | "rejected";
  details?: {
    organization?: string;
    address?: string;
    phone?: string;
    licenseNumber?: string;
    position?: string;
    [key: string]: any;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: Omit<User, "id" | "status"> & { password: string }) => Promise<void>;
  logout: () => void;
}

// Mock users for development
const MOCK_USERS: User[] = [
  {
    id: "admin-1",
    name: "Admin User",
    email: "admin@lifeline.com",
    role: "admin",
    status: "approved",
    details: {
      organization: "Lifeline Emergency Services",
      position: "System Administrator",
    }
  },
  {
    id: "amb-1",
    name: "John Ambulance",
    email: "john@ambulance.com",
    role: "ambulance",
    status: "approved",
    details: {
      organization: "City Ambulance Services",
      licenseNumber: "AMB12345",
      phone: "555-123-4567",
    }
  },
  {
    id: "hosp-1",
    name: "Sarah Hospital",
    email: "sarah@hospital.com",
    role: "hospital",
    status: "approved",
    details: {
      organization: "General City Hospital",
      position: "Emergency Coordinator",
      address: "123 Medical Center Blvd",
      phone: "555-987-6543",
    }
  },
  {
    id: "pol-1",
    name: "Mike Police",
    email: "mike@police.com",
    role: "police",
    status: "approved",
    details: {
      organization: "City Police Department",
      position: "Traffic Officer",
      badgeNumber: "PD98765",
      phone: "555-456-7890",
    }
  },
  {
    id: "new-1",
    name: "New User",
    email: "new@user.com",
    role: "ambulance",
    status: "pending",
    details: {
      organization: "Suburban Ambulance Corp",
      licenseNumber: "AMB54321",
      phone: "555-222-3333",
    }
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("lifecare_user");
    
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem("lifecare_user");
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Find user by email (mock implementation)
      const foundUser = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!foundUser) {
        throw new Error("Invalid email or password");
      }
      
      // In a real app, you would validate the password here
      if (password !== "password") { // Mock password verification
        throw new Error("Invalid email or password");
      }
      
      // Check if user is approved
      if (foundUser.status !== "approved" && foundUser.role !== "admin") {
        throw new Error("Your account is pending approval by an administrator");
      }
      
      // Set user in state and localStorage
      setUser(foundUser);
      localStorage.setItem("lifecare_user", JSON.stringify(foundUser));
      
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: Omit<User, "id" | "status"> & { password: string }) => {
    setIsLoading(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if email already exists
      if (MOCK_USERS.some(u => u.email.toLowerCase() === userData.email.toLowerCase())) {
        throw new Error("Email already registered");
      }
      
      // Create new user (in a real app, this would be saved to a database)
      const newUser: User = {
        id: `new-${Date.now()}`,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        status: "pending",
        details: userData.details,
      };
      
      // In a real app, we would save the user to the database here
      console.log("Registered new user:", newUser);
      
      // For demo purposes, we're not setting the user in state
      // since they need admin approval first
      
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("lifecare_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
