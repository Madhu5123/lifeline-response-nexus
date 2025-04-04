
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Mail, Lock } from "lucide-react";
import { useAuth } from "@/contexts/RealtimeAuthContext";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { ADMIN_EMAIL } from "@/utils/firebase-helpers";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { login, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "ambulance") navigate("/ambulance");
      else if (user.role === "hospital") navigate("/hospital");
      else if (user.role === "police") navigate("/police");
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    
    try {
      await login(email, password);
      
      // Show different messages for admin vs regular users
      if (email === ADMIN_EMAIL) {
        toast({
          title: "Admin Login successful",
          description: "Welcome to Lifeline AI Admin Panel",
        });
      } else {
        toast({
          title: "Login successful",
          description: "Welcome to Lifeline AI",
        });
      }
    } catch (error: any) {
      setError(error.message || "Failed to login");
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      <div className="pt-16 pb-8 px-6">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="w-20 h-20 mb-4 mx-auto rounded-full bg-emergency-ambulance flex items-center justify-center shadow-lg">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              className="w-10 h-10 text-white"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">
            Lifeline AI
          </h1>
          <p className="text-gray-600 mt-2">
            Log in to your account
          </p>
        </motion.div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="flex-grow px-6 pb-8 flex flex-col"
      >
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label 
              htmlFor="email" 
              className="text-gray-700 font-medium block"
            >
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emergency-ambulance focus:ring-emergency-ambulance bg-white shadow-sm"
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label 
                htmlFor="password" 
                className="text-gray-700 font-medium block"
              >
                Password
              </Label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-emergency-ambulance focus:ring-emergency-ambulance bg-white shadow-sm"
                required
              />
            </div>
          </div>
          
          <Button 
            type="submit" 
            className="w-full py-6 rounded-xl text-lg font-semibold bg-emergency-ambulance hover:bg-opacity-90 transition-all shadow-md"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </motion.div>
      
      <div className="pb-8 pt-4 text-center">
        <div className="text-sm text-gray-500">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-emergency-ambulance hover:text-emergency-hospital transition-colors"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
