import React, { createContext, useState, useEffect, useContext, ReactNode } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from "firebase/auth";
import { ref, set, get, off } from "firebase/database";
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

  console.log("AuthProvider rendered:", { user, isAuthenticated: !!user && (user.status === "approved" || user.role === "admin") });

  // Effect for Firebase auth state
  useEffect(() => {
    console.log("Setting up Firebase auth state listener");

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("Firebase auth state changed:", firebaseUser?.email);
      setCurrentUser(firebaseUser);

      if (firebaseUser) {
        await fetchUserData(firebaseUser.uid);
      } else {
        console.log("No authenticated user found");
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      console.log("Fetching user data from Firebase...");
      const userRef = ref(db, `users/${userId}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const userData = snapshot.val();
        console.log("User data from Firebase:", userData);
        setUser({
          id: userId,
          email: userData.email || "",
          name: userData.name || "",
          role: userData.role || "unverified",
          status: userData.status || "pending",
          details: userData.details || {},
        });
      } else {
        console.log("No user data found in database");
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (!currentUser) return;
    await fetchUserData(currentUser.uid);
  };

  const login = async (email: string, password: string) => {
    try {
      console.log("Login attempt:", email);

      if (isAdminCredentials(email, password)) {
        console.log("Admin login detected");
        setUser(ADMIN_USER);
        setCurrentUser(null);
        return;
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Firebase login successful:", userCredential.user.email);

      await refreshUserData();
    } catch (error: any) {
      console.error("Login error:", error);
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await set(ref(db, `users/${user.uid}`), {
        name,
        email,
        role,
        status: "pending",
        createdAt: new Date().toISOString(),
        details: details || {},
      });

      // await set(ref(db, `pendingApprovals/${user.uid}`), {
      //   userId: user.uid,
      //   name,
      //   email,
      //   role,
      //   submittedAt: new Date().toISOString(),
      // });
    } catch (error: any) {
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
      if (user?.email === ADMIN_EMAIL) {
        setUser(null);
        return;
      }

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
    isAuthenticated: !!user && !!user.role && (user.status === "approved" || user.role === "admin"),
    isLoading,
    login,
    register,
    logout,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
