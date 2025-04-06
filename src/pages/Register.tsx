import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { AlertCircle, Loader2, Mail, Lock, User, Phone, Building, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/RealtimeAuthContext";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import ImageUploader from "@/components/ImageUploader";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { motion } from "framer-motion";
import { UserRole } from "@/models/types";

interface RoleImages {
  [key: string]: File | null;
}

const ROLE_FIELDS: {
  [key in UserRole]?: {
    images: Array<{
      id: string;
      label: string;
    }>;
    extraFields: boolean;
  };
} = {
  'ambulance': {
    images: [
      { id: 'vehicleNumber', label: 'Vehicle Number' },
      { id: 'ambulancePhoto', label: 'Ambulance Photo' },
      { id: 'driverWithAmbulance', label: 'Photo of Driver with Ambulance' }
    ],
    extraFields: true
  },
  'hospital': {
    images: [
      { id: 'idCard', label: 'Hospital ID Card' },
      { id: 'staffUniform', label: 'Photo in Hospital Uniform' }
    ],
    extraFields: true
  },
  'police': {
    images: [
      { id: 'policeId', label: 'Police ID Card' },
      { id: 'policeUniform', label: 'Selfie in Police Uniform' }
    ],
    extraFields: true
  }
};

const Register: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [organization, setOrganization] = useState("");
  const [vehicleNumber, setvehicleNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [position, setPosition] = useState("");
  
  const [roleImages, setRoleImages] = useState<RoleImages>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [step, setStep] = useState(1);
  
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (showDialog) {
      const redirectTimer = setTimeout(() => {
        setShowDialog(false);
        navigate("/login");
      }, 3000);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [showDialog, navigate]);

  const handleImageChange = (id: string, file: File | null) => {
    setRoleImages(prev => ({
      ...prev,
      [id]: file
    }));
  };

  const validateImages = () => {
    if (!role || !ROLE_FIELDS[role as UserRole]) return true;
    
    const requiredImages = ROLE_FIELDS[role as UserRole]?.images || [];
    
    for (const image of requiredImages) {
      if (!roleImages[image.id]) {
        setError(`Please upload your ${image.label}`);
        return false;
      }
    }
    
    return true;
  };

  const uploadImages = async () => {
    if (!role || !ROLE_FIELDS[role as UserRole]) return {};
    
    const imageUrls: Record<string, string> = {};
    const imagesToUpload = Object.entries(roleImages).filter(([_, file]) => !!file);
    
    if (imagesToUpload.length === 0) return imageUrls;
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      let completed = 0;
      
      for (const [id, file] of imagesToUpload) {
        if (!file) continue;
        
        const result = await uploadImageToCloudinary(file);
        imageUrls[id] = result.secure_url;
        
        completed++;
        setUploadProgress(Math.round((completed / imagesToUpload.length) * 100));
      }
      
      return imageUrls;
    } catch (error) {
      console.error("Error uploading images:", error);
      throw new Error("Failed to upload images. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const validateStep1 = () => {
    if (!name) {
      setError("Please enter your name");
      return false;
    }
    if (!email) {
      setError("Please enter your email");
      return false;
    }
    if (!password) {
      setError("Please create a password");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const goToNextStep = () => {
    if (step === 1 && validateStep1()) {
      setError("");
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!role) {
      setError("Please select your role");
      return;
    }
    
    if (!validateImages()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const imageUrls = await uploadImages();
      
      await register({
        name,
        email,
        password,
        role,
        details: {
          organization,
          vehicleNumber,
          address,
          phone,
          position,
          imageUrls: imageUrls
        }
      });
      
      setShowDialog(true);
    } catch (error: any) {
      setError(error.message || "Registration failed");
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    navigate("/login");
  };

  const renderRoleSpecificFields = () => {
    if (!role) return null;
    
    const roleConfig = ROLE_FIELDS[role as UserRole];
    if (!roleConfig) return null;
    
    return (
      <>
        {role === "ambulance" && (
          <div className="space-y-2">
            <Label htmlFor="vehicleNumber">Vehicle Number</Label>
            <div className="relative">
              <Input
                id="vehicleNumber"
                placeholder="Enter your vechile number"
                value={vehicleNumber}
                onChange={(e) => setvehicleNumber(e.target.value)}
                className="pl-10 rounded-xl"
                required
              />
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            </div>
          </div>
        )}
        
        {role === "hospital" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <div className="relative">
                <Input
                  id="position"
                  placeholder="Enter your position"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="pl-10 rounded-xl"
                  required
                />
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Hospital Address</Label>
              <div className="relative">
                <Textarea
                  id="address"
                  placeholder="Enter hospital address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="pl-10 pt-2 rounded-xl min-h-[100px]"
                  required
                />
                <MapPin className="absolute left-3 top-3 text-gray-400 h-5 w-5" />
              </div>
            </div>
          </>
        )}
        
        {role === "police" && (
          <div className="space-y-2">
            <Label htmlFor="position">Position / Badge Number</Label>
            <div className="relative">
              <Input
                id="position"
                placeholder="Enter your position or badge number"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="pl-10 rounded-xl"
                required
              />
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            </div>
          </div>
        )}
        
        {roleConfig.images.map((image) => (
          <ImageUploader
            key={image.id}
            label={image.label}
            onChange={(file) => handleImageChange(image.id, file)}
            required
          />
        ))}
      </>
    );
  };

  const renderStep1 = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            id="name"
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="pl-10 rounded-xl"
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 rounded-xl"
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              id="password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 rounded-xl"
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 rounded-xl"
              required
            />
          </div>
        </div>
      </div>
      
      <Button 
        onClick={goToNextStep}
        className="w-full py-6 rounded-xl text-lg font-semibold bg-emergency-ambulance hover:bg-opacity-90 transition-all shadow-md mt-4"
      >
        Continue
      </Button>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select 
          value={role} 
          onValueChange={(value) => {
            setRole(value as UserRole);
            setRoleImages({});
          }}
          required
        >
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder="Select your role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ambulance">Ambulance Driver</SelectItem>
            <SelectItem value="hospital">Hospital Staff</SelectItem>
            <SelectItem value="police">Police Officer</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="organization">Organization</Label>
        <div className="relative">
          <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            id="organization"
            placeholder="Enter your organization name"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            className="pl-10 rounded-xl"
            required
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            id="phone"
            placeholder="Enter your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="pl-10 rounded-xl"
            required
          />
        </div>
      </div>
      
      {renderRoleSpecificFields()}
      
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading images...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-emergency-ambulance h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      <div className="flex space-x-3">
        <Button 
          variant="outline"
          onClick={() => setStep(1)}
          className="flex-1 py-6 rounded-xl text-lg"
        >
          Back
        </Button>
        <Button 
          type="submit" 
          className="flex-1 py-6 rounded-xl text-lg font-semibold bg-emergency-ambulance hover:bg-opacity-90 transition-all shadow-md"
          disabled={isLoading || isUploading}
        >
          {(isLoading || isUploading) ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isUploading ? "Uploading..." : "Registering..."}
            </>
          ) : "Register"}
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="px-4 py-8">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
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
          <h1 className="text-2xl font-bold text-gray-800">
            Create an Account
          </h1>
          <p className="text-gray-600 mt-1">
            Join Lifeline Emergency Response AI
          </p>
        </motion.div>
        
        <Card className="p-6 rounded-2xl shadow-lg max-w-md mx-auto bg-white/90 backdrop-blur-sm">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-xl mb-4 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div className={`h-1 rounded-full flex-1 ${step === 1 ? 'bg-emergency-ambulance' : 'bg-gray-200'}`}></div>
              <div className="mx-2"></div>
              <div className={`h-1 rounded-full flex-1 ${step === 2 ? 'bg-emergency-ambulance' : 'bg-gray-200'}`}></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Basic Info</span>
              <span>Role Details</span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit}>
            {step === 1 ? renderStep1() : renderStep2()}
          </form>
        </Card>
        
        <div className="mt-6 text-center">
          <div className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-emergency-ambulance hover:text-emergency-hospital transition-colors"
            >
              Login here
            </Link>
          </div>
        </div>
      </div>
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white rounded-2xl">
          <DialogHeader>
            <DialogTitle>Registration Submitted</DialogTitle>
            <DialogDescription>
              Thank you for registering with Lifeline Emergency Response. Your application has been submitted and is pending approval by an administrator.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            You will receive a notification once your account has been approved. This usually takes 24-48 hours.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Redirecting to login page...
          </p>
          <DialogFooter>
            <Button onClick={handleCloseDialog} className="bg-emergency-ambulance hover:bg-opacity-90">
              Return to Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Register;
