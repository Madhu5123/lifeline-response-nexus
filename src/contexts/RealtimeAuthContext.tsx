
import React, { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { ref, set, get, onValue, off } from "firebase/database";
import { auth, db } from "@/lib/firebase";
import { User, UserRole, UserDetails } from "@/models/types";
import { useToast } from "@/hooks/use-toast";
import { isAdminCredentials, ADMIN_EMAIL } from "@/utils/firebase-helpers";

interface AuthContextType {
  currentUser: FirebaseUser | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (registerData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  details?: UserDetails;
}

// Admin user object
const ADMIN_USER: User = {
  id: "admin-user-id",
  email: ADMIN_EMAIL,
  name: "Admin User",
  role: "admin",
  status: "approved",
  details: {}
};

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUserData: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { toast } = useToast();

  console.log("AuthProvider rendered, current user state:", { user, isAuthenticated: !!user && (user.status === "approved" || user.role === "admin") });

  // Effect for Firebase auth state
  useEffect(() => {
    console.log("Setting up Firebase auth state listener");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Firebase auth state changed:", firebaseUser?.email);
      setCurrentUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Fetch user data from Realtime DB
          const userRef = ref(db, `users/${firebaseUser.uid}`);
          onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
              const userData = snapshot.val();
              console.log("User data from Firebase:", userData);
              setUser({
                id: firebaseUser.uid,
                email: firebaseUser.email || "",
                name: userData.name || "",
                role: userData.role || "unverified",
                status: userData.status || "pending",
                details: userData.details || {},
              });
            } else {
              console.log("No user data found in database");
              setUser(null);
            }
            setIsLoading(false);
          }, (error) => {
            console.error("Error fetching user data:", error);
            setIsLoading(false);
          });
        } catch (error) {
          console.error("Error setting up user data listener:", error);
          setIsLoading(false);
        }
      } else {
        // If no firebase user and not admin, set user to null
        if (user?.email !== ADMIN_EMAIL) {
          setUser(null);
        }
        setIsLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, [user?.email]);

  const refreshUserData = async () => {
    if (!currentUser) return;
    
    try {
      const userRef = ref(db, `users/${currentUser.uid}`);
      const snapshot = await get(userRef);
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setUser({
          id: currentUser.uid,
          email: currentUser.email || "",
          name: userData.name || "",
          role: userData.role || "unverified",
          status: userData.status || "pending",
          details: userData.details || {},
        });
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
      toast({
        title: "Error",
        description: "Failed to refresh user data.",
        variant: "destructive",
      });
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log("Login attempt:", email);
      // Check if using admin credentials
      if (isAdminCredentials(email, password)) {
        console.log("Admin login detected");
        setUser(ADMIN_USER);
        setCurrentUser(null); // No firebase user for admin
        return;
      }
      
      // Regular Firebase auth login
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Firebase login successful:", userCredential.user.email);
      
      // For regular users, we'll get their data through the auth state change listener
    } catch (error: any) {
      console.error("Login error:", error);
      // Handle specific Firebase auth errors
      let errorMessage = "Login failed. Please check your credentials.";
      
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password") {
        errorMessage = "Invalid email or password.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many unsuccessful login attempts. Please try again later.";
      }
      
      throw new Error(errorMessage);
    }
  };

  const register = async ({ name, email, password, role, details }: RegisterData) => {
    try {
      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user in Realtime Database
      await set(ref(db, `users/${user.uid}`), {
        name,
        email,
        role,
        status: "pending", // New users start with pending status
        createdAt: new Date().toISOString(),
        details: details || {},
      });
      
      // Also add to the admin approval queue
      await set(ref(db, `pendingApprovals/${user.uid}`), {
        userId: user.uid,
        name,
        email,
        role,
        submittedAt: new Date().toISOString(),
      });
      
    } catch (error: any) {
      // Handle specific Firebase auth errors
      let errorMessage = "Registration failed. Please try again.";
      
      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Email already in use.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak.";
      }
      
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      // If admin user, just clear the state
      if (user?.email === ADMIN_EMAIL) {
        setUser(null);
        return;
      }
      
      // Clean up any user data listeners
      if (currentUser) {
        const userRef = ref(db, `users/${currentUser.uid}`);
        off(userRef);
      }
      
      await firebaseSignOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Error during logout:", error);
      throw new Error("Failed to log out.");
    }
  };

  const value = {
    currentUser,
    user,
    isAuthenticated: !!user && (user.status === "approved" || user.role === "admin"),
    isLoading,
    login,
    register,
    logout,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
