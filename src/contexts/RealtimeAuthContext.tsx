
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

  // Effect for Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Fetch user data from Realtime DB
          const userRef = ref(db, `users/${firebaseUser.uid}`);
          onValue(userRef, (snapshot) => {
            if (snapshot.exists()) {
              const userData = snapshot.val();
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
        setUser(null);
        setIsLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

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
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
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
    isAuthenticated: !!user && user.status === "approved",
    isLoading,
    login,
    register,
    logout,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
