
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { setGoogleMapsApiKey, getGoogleMapsApiKey, isGoogleMapsApiKeySet } from '@/utils/maps';
import { toast } from 'sonner';

interface GoogleMapsApiKeyInputProps {
  onKeySet?: () => void;
}

const GoogleMapsApiKeyInput: React.FC<GoogleMapsApiKeyInputProps> = ({ onKeySet }) => {
  const [apiKey, setApiKey] = useState('');
  const [keySet, setKeySet] = useState(false);

  useEffect(() => {
    // Check if API key is already set
    const existingKey = getGoogleMapsApiKey();
    if (existingKey) {
      setApiKey(existingKey);
      setKeySet(true);
    }
  }, []);

  const handleSaveKey = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter a valid Google Maps API key');
      return;
    }

    setGoogleMapsApiKey(apiKey.trim());
    setKeySet(true);
    toast.success('Google Maps API key saved successfully');
    
    if (onKeySet) {
      onKeySet();
    }
  };

  const handleClearKey = () => {
    setGoogleMapsApiKey('');
    setApiKey('');
    setKeySet(false);
    toast.info('Google Maps API key cleared');
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Google Maps Configuration</CardTitle>
        <CardDescription>
          Enter your Google Maps API key with Maps JavaScript API and Distance Matrix API enabled
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            You need a Google Maps API key to use the map features. You can get one from the{' '}
            <a 
              href="https://developers.google.com/maps/documentation/javascript/get-api-key" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Google Cloud Console
            </a>.
          </p>
          <Input
            type="text"
            placeholder="Enter your Google Maps API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full"
          />
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={handleSaveKey}>
          {keySet ? 'Update Key' : 'Save Key'}
        </Button>
        {keySet && (
          <Button variant="outline" onClick={handleClearKey}>
            Clear Key
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default GoogleMapsApiKeyInput;
