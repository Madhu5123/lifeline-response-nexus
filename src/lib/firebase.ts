
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, clearIndexedDbPersistence, connectFirestoreEmulator } from "firebase/firestore";
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
  measurementId: "G-FDKCQ3TZD7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable offline persistence for mobile apps
// This will be called in the main component after checking if we're on a mobile device
export const enableOfflinePersistence = async () => {
  try {
    await enableIndexedDbPersistence(db);
    console.log("Offline persistence enabled");
  } catch (error: any) {
    console.error("Error enabling offline persistence:", error);
    if (error.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn("Multiple tabs open, persistence only enabled in one tab");
    } else if (error.code === 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.warn("Current browser doesn't support persistence");
    }
  }
};

// Clear persistence cache - can be used to solve data sync issues
export const clearPersistenceCache = async () => {
  try {
    await clearIndexedDbPersistence(db);
    console.log("IndexedDB persistence cleared successfully");
    return true;
  } catch (error) {
    console.error("Error clearing persistence:", error);
    return false;
  }
};

// Helper to initialize Firebase in App.tsx with proper error handling
export const initializeFirebase = async (isMobile: boolean) => {
  try {
    // If on mobile, enable offline persistence
    if (isMobile) {
      await enableOfflinePersistence();
    }
    
    // Setup listeners for network connectivity issues
    window.addEventListener('online', () => {
      console.log('App is online. Reconnecting to Firestore...');
    });
    
    window.addEventListener('offline', () => {
      console.log('App is offline. Some changes may be cached locally.');
    });
    
    return true;
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    return false;
  }
};
