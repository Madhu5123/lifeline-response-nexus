
import React, { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/RealtimeAuthContext";
import SplashScreen from "./components/SplashScreen";
import { initializeFirebase } from "./lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "./hooks/use-mobile";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import AmbulanceDashboard from "./pages/AmbulanceDashboard";
import HospitalDashboard from "./pages/HospitalDashboard";
import PoliceDashboard from "./pages/PoliceDashboard";
import NotFound from "./pages/NotFound";

// Create a client with more aggressive refetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute (decreased from 5 minutes)
      refetchOnWindowFocus: true, // Changed to true to refetch when tab gets focus
      refetchOnMount: true, // Refetch when component mounts
      refetchOnReconnect: true, // Refetch when reconnecting
      retry: 3, // Retry failed queries up to 3 times
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles: string[]; 
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Redirect to their appropriate dashboard
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "ambulance") return <Navigate to="/ambulance" replace />;
    if (user.role === "hospital") return <Navigate to="/hospital" replace />;
    if (user.role === "police") return <Navigate to="/police" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Add the missing import for useAuth
import { useAuth } from "./contexts/RealtimeAuthContext";

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [firebaseInitialized, setFirebaseInitialized] = useState(false);
  const { toast } = useToast();
  const isMobile = useMobile();
  
  // Initialize Firebase with proper configuration
  useEffect(() => {
    const setupFirebase = async () => {
      console.log("Setting up Firebase...");
      const success = await initializeFirebase(isMobile);
      
      if (success) {
        console.log("Firebase initialization successful");
        setFirebaseInitialized(true);
      } else {
        console.error("Firebase initialization failed");
        toast({
          title: "Connection Issue",
          description: "There was a problem connecting to the server. Some features may not work correctly.",
          variant: "destructive",
        });
        setFirebaseInitialized(true); // Still proceed, but user has been warned
      }
    };
    
    setupFirebase();
    
    // Setup online/offline detection with toast notifications
    const handleOnline = () => {
      toast({
        title: "You're back online",
        description: "Data will now sync with the server",
      });
    };
    
    const handleOffline = () => {
      toast({
        title: "You're offline",
        description: "Some changes may not be saved until you reconnect",
        variant: "destructive",
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast, isMobile]);
  
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (!firebaseInitialized && !showSplash) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Connecting to servers...
      </div>
    );
  }

  return (
    <React.StrictMode>
      {showSplash ? (
        <SplashScreen onComplete={handleSplashComplete} />
      ) : (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  
                  <Route 
                    path="/admin" 
                    element={
                      <ProtectedRoute allowedRoles={["admin"]}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/ambulance" 
                    element={
                      <ProtectedRoute allowedRoles={["ambulance"]}>
                        <AmbulanceDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/hospital" 
                    element={
                      <ProtectedRoute allowedRoles={["hospital"]}>
                        <HospitalDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route 
                    path="/police" 
                    element={
                      <ProtectedRoute allowedRoles={["police"]}>
                        <PoliceDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      )}
    </React.StrictMode>
  );
};

export default App;
