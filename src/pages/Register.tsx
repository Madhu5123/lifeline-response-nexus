
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
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
      { id: 'driverLicense', label: 'Driving License' },
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
  const [licenseNumber, setLicenseNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [position, setPosition] = useState("");
  
  const [roleImages, setRoleImages] = useState<RoleImages>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    // Validate role selection
    if (!role) {
      setError("Please select your role");
      return;
    }
    
    // Validate required images
    if (!validateImages()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Upload images first
      const imageUrls = await uploadImages();
      
      // Register user with image URLs
      await register({
        name,
        email,
        password,
        role,
        details: {
          organization,
          licenseNumber,
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
            <Label htmlFor="licenseNumber">Driver License Number</Label>
            <Input
              id="licenseNumber"
              placeholder="Enter your license number"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              required
            />
          </div>
        )}
        
        {role === "hospital" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                placeholder="Enter your position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Hospital Address</Label>
              <Textarea
                id="address"
                placeholder="Enter hospital address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>
          </>
        )}
        
        {role === "police" && (
          <div className="space-y-2">
            <Label htmlFor="position">Position / Badge Number</Label>
            <Input
              id="position"
              placeholder="Enter your position or badge number"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
            />
          </div>
        )}
        
        {/* Image upload fields */}
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Create an Account
          </CardTitle>
          <CardDescription className="text-center">
            Register to join Lifeline Emergency Response
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              
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
                  <SelectTrigger className="w-full">
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
                <Input
                  id="organization"
                  placeholder="Enter your organization name"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
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
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <Button 
                type="submit" 
                className="w-full" 
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
          </form>
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <div className="text-sm text-center text-gray-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Login here
            </Link>
          </div>
        </CardFooter>
      </Card>
      
      {/* Registration success dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registration Submitted</DialogTitle>
            <DialogDescription>
              Thank you for registering with Lifeline Emergency Response. Your application has been submitted and is pending approval by an administrator.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-gray-500">
            You will receive a notification once your account has been approved. This usually takes 24-48 hours.
          </p>
          <DialogFooter>
            <Button onClick={handleCloseDialog}>Return to Login</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Register;
