
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
  getDocs
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check for existing session on mount and listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsLoading(true);
      
      if (firebaseUser) {
        // User is signed in, fetch their data from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          
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
                id: firebaseUser.uid,
                ...userData,
              });
            }
          } else {
            // User document doesn't exist
            await signOut(auth);
            setUser(null);
            toast({
              title: "Account error",
              description: "Your account data could not be found",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          await signOut(auth);
          setUser(null);
          toast({
            title: "Authentication error",
            description: "There was an error retrieving your account information",
            variant: "destructive",
          });
        }
      } else {
        // User is signed out
        setUser(null);
      }
      
      setIsLoading(false);
    });
    
    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [toast]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      // Sign in with Firebase Auth
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
