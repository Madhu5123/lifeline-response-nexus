
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, ImageIcon, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  label: string;
  onChange: (file: File | null) => void;
  className?: string;
  required?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  onChange,
  className,
  required = false,
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0] || null;
    
    if (!file) {
      setPreview(null);
      onChange(null);
      return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      setPreview(null);
      onChange(null);
      return;
    }
    
    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      setPreview(null);
      onChange(null);
      return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    onChange(file);
  };
  
  const clearFile = () => {
    setPreview(null);
    setError(null);
    onChange(null);
  };
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {preview && (
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={clearFile}
            className="h-6 px-2"
          >
            <X className="h-4 w-4" />
            <span>Clear</span>
          </Button>
        )}
      </div>
      
      {!preview ? (
        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label={label}
            required={required}
          />
          <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center gap-2 bg-gray-50 hover:bg-gray-100 transition-colors">
            <Upload className="h-6 w-6 text-gray-400" />
            <p className="text-sm text-gray-500">Click to upload {label}</p>
            <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-md overflow-hidden border border-gray-200">
          <img 
            src={preview} 
            alt={label} 
            className="w-full h-40 object-cover"
          />
          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
            <Check className="h-4 w-4" />
          </div>
        </div>
      )}
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};

export default ImageUploader;
