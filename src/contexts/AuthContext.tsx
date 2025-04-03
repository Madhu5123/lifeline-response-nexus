
import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  serverTimestamp, 
  collection,
  query,
  where,
  getDocs,
  onSnapshot
} from "firebase/firestore";
import { auth, db, clearPersistenceCache } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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
    imageUrls?: Record<string, string>;
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
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin hard-coded credentials
const ADMIN_EMAIL = "admin@lifeline.com";
const ADMIN_PASSWORD = "adminlifeline";
const ADMIN_USER: User = {
  id: "admin-user-id",
  name: "Admin User",
  email: ADMIN_EMAIL,
  role: "admin",
  status: "approved"
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentFirebaseUser, setCurrentFirebaseUser] = useState<FirebaseUser | null>(null);
  const { toast } = useToast();

  // New function to refresh user data on demand
  const refreshUserData = async () => {
    if (!currentFirebaseUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, "users", currentFirebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as Omit<User, "id">;
        
        // Check if user is approved
        if (userData.status !== "approved" && userData.role !== "admin") {
          // User is not approved, sign them out
          await signOut(auth);
          setUser(null);
          toast({
            title: "Account not approved",
            description: "Your account is pending approval by an administrator",
            variant: "destructive",
          });
        } else {
          // User is approved, set user data
          setUser({
            id: currentFirebaseUser.uid,
            ...userData,
          });
        }
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  // Check for existing session on mount and listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      setCurrentFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        // User is signed in, set up a real-time listener to their Firestore document
        try {
          // Use onSnapshot to get real-time updates to the user document
          const unsubscribeSnapshot = onSnapshot(
            doc(db, "users", firebaseUser.uid),
            (docSnapshot) => {
              if (docSnapshot.exists()) {
                const userData = docSnapshot.data() as Omit<User, "id">;
                
                // Check if user is approved
                if (userData.status !== "approved" && userData.role !== "admin") {
                  // User is not approved, sign them out
                  signOut(auth).then(() => {
                    setUser(null);
                    toast({
                      title: "Account not approved",
                      description: "Your account is pending approval by an administrator",
                      variant: "destructive",
                    });
                  });
                } else {
                  // User is approved, set user data
                  setUser({
                    id: firebaseUser.uid,
                    ...userData,
                  });
                }
              } else {
                // User document doesn't exist
                signOut(auth).then(() => {
                  setUser(null);
                  toast({
                    title: "Account error",
                    description: "Your account data could not be found",
                    variant: "destructive",
                  });
                });
              }
              setIsLoading(false);
            },
            (error) => {
              console.error("Error listening to user document:", error);
              setIsLoading(false);
            }
          );
          
          // Return a cleanup function to unsubscribe from both listeners
          return () => {
            unsubscribeSnapshot();
            unsubscribe();
          };
        } catch (error) {
          console.error("Error fetching user data:", error);
          await signOut(auth);
          setUser(null);
          toast({
            title: "Authentication error",
            description: "There was an error retrieving your account information",
            variant: "destructive",
          });
          setIsLoading(false);
        }
      } else {
        // User is signed out
        setUser(null);
        setIsLoading(false);
      }
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [toast]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      // Check if admin credentials
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        // Set admin user directly without Firebase Auth
        setUser(ADMIN_USER);
        toast({
          title: "Admin Login successful",
          description: "Welcome to Lifeline Emergency Response",
        });
        setIsLoading(false);
        return;
      }
      
      // For non-admin users, proceed with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // User data will be set by the onAuthStateChanged listener
      
    } catch (error: any) {
      console.error("Login error:", error);
      
      let errorMessage = "Invalid email or password";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = "Invalid email or password";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed login attempts. Please try again later.";
      } else {
        errorMessage = error.message || "An error occurred during login";
      }
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: Omit<User, "id" | "status"> & { password: string }) => {
    setIsLoading(true);
    
    try {
      // Clear any existing persistence cache to ensure fresh data
      await clearPersistenceCache();
      
      // Check if email already exists in Firestore
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", userData.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        throw new Error("Email already registered");
      }
      
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );
      
      // Create user document in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        name: userData.name,
        email: userData.email,
        role: userData.role,
        status: "pending", // All new users start as pending
        details: userData.details || {},
        createdAt: serverTimestamp(),
      });
      
      // Sign out the user immediately after registration since they need approval
      await signOut(auth);
      
      toast({
        title: "Registration successful",
        description: "Your account is pending approval by an administrator",
      });
      
    } catch (error: any) {
      console.error("Registration error:", error);
      
      let errorMessage = "Registration failed";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "Email already registered";
      } else {
        errorMessage = error.message || "An error occurred during registration";
      }
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear persistence cache on logout to ensure fresh data on next login
      await clearPersistenceCache();
      
      // Check if admin user
      if (user?.email === ADMIN_EMAIL) {
        // Simply clear the user state
        setUser(null);
        return;
      }
      
      // For non-admin users, sign out from Firebase
      await signOut(auth);
      // The onAuthStateChanged listener will set the user to null
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "There was an error during logout",
        variant: "destructive",
      });
    }
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
        refreshUserData,
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
