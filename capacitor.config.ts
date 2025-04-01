
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.40f67b9cfa4c4b709c177b848ef76ef0',
  appName: 'lifeline-response-nexus',
  webDir: 'dist',
  server: {
    url: 'https://40f67b9c-fa4c-4b70-9c17-7b848ef76ef0.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      backgroundColor: "#ffffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP"
    }
  }
};

export default config;
