
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lifelineai.app',
  appName: 'Lifeline AI',
  webDir: 'dist',
  server: {
    url: 'https://preview--lifeline-response-nexus.lovable.app/',
    cleartext: true
  },
  plugins: {
  //   SplashScreen: {
  //     launchShowDuration: 3000,
  //     backgroundColor: "#ffffffff",
  //     androidSplashResourceName: "splash",
  //     androidScaleType: "CENTER_CROP"
  //   }
  }
};

export default config;
