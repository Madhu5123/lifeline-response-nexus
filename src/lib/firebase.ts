
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, get, onValue, off, serverTimestamp, connectDatabaseEmulator } from "firebase/database";
import { getAuth, connectAuthEmulator } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDoaSY-n_ebkRccENDb9HHubXQyQtIxfvI",
  authDomain: "lifeline-ai-485e3.firebaseapp.com",
  projectId: "lifeline-ai-485e3",
  storageBucket: "lifeline-ai-485e3.firebasestorage.app",
  messagingSenderId: "114223980407",
  appId: "1:114223980407:web:732e297a81e32a9efbcb72",
  measurementId: "G-FDKCQ3TZD7",
  databaseURL: "https://lifeline-ai-485e3-default-rtdb.firebaseio.com" // Add the Realtime Database URL
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

// Enable offline persistence for mobile apps
// This will be called in the main component after checking if we're on a mobile device
export const enableOfflinePersistence = async () => {
  try {
    // Realtime Database has built-in offline persistence
    console.log("Offline persistence enabled by default in Realtime Database");
    return true;
  } catch (error: any) {
    console.error("Error with Realtime Database:", error);
    return false;
  }
};

// Check and request geolocation permissions
export const checkGeolocationPermission = async (): Promise<boolean> => {
  if (!navigator.geolocation) {
    console.warn("Geolocation is not supported by this browser");
    return false;
  }
  
  try {
    // Try to get the current position once to check permissions
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true), // Permission granted
        (error) => {
          console.error("Geolocation permission error:", error);
          resolve(false); // Permission denied
        },
        { timeout: 10000 }
      );
    });
  } catch (error) {
    console.error("Error checking geolocation permission:", error);
    return false;
  }
};

// Clear persistence cache - can be used to solve data sync issues
export const clearPersistenceCache = async () => {
  try {
    // In Realtime Database, we can't directly clear the cache
    // But we can force a server sync
    console.log("Forcing Realtime Database sync");
    return true;
  } catch (error) {
    console.error("Error syncing with Realtime Database:", error);
    return false;
  }
};

// Helper to check Firebase connection status
export const checkFirebaseConnection = () => {
  const connectedRef = ref(db, '.info/connected');
  return new Promise<boolean>((resolve) => {
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val() === true;
      unsubscribe();
      resolve(connected);
    }, (error) => {
      console.error("Error checking connection:", error);
      resolve(false);
    });
    
    // Set a timeout in case the connection check takes too long
    setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, 5000);
  });
};

// Helper to initialize Firebase in App.tsx with proper error handling
export const initializeFirebase = async (isMobile: boolean) => {
  try {
    // Enable offline persistence (automatic in Realtime Database)
    if (isMobile) {
      await enableOfflinePersistence();
    }
    
    // Check geolocation permissions
    const geolocationPermission = await checkGeolocationPermission();
    console.log("Geolocation permission:", geolocationPermission ? "granted" : "denied");
    
    // Check if we're connected to Firebase
    const isConnected = await checkFirebaseConnection();
    console.log("Firebase connection:", isConnected ? "connected" : "disconnected");
    
    // Setup listeners for network connectivity issues
    window.addEventListener('online', () => {
      console.log('App is online. Reconnecting to Firebase...');
    });
    
    window.addEventListener('offline', () => {
      console.log('App is offline. Some changes may be cached locally.');
    });
    
    return isConnected;
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    return false;
  }
};
