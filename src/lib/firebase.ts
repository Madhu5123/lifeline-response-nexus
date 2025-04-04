import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  enableIndexedDbPersistence, 
  clearIndexedDbPersistence, 
  connectFirestoreEmulator,
  collection,
  doc,
  onSnapshot
} from "firebase/firestore";
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

// Enable offline persistence for mobile apps with better error handling
export const enableOfflinePersistence = async () => {
  try {
    await enableIndexedDbPersistence(db);
    console.log("Offline persistence enabled");
    return true;
  } catch (error: any) {
    console.error("Error enabling offline persistence:", error);
    if (error.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn("Multiple tabs open, persistence only enabled in one tab");
    } else if (error.code === 'unimplemented') {
      // The current browser does not support all of the features required to enable persistence
      console.warn("Current browser doesn't support persistence");
    }
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
        { timeout: 10000, enableHighAccuracy: true }
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
    await clearIndexedDbPersistence(db);
    console.log("IndexedDB persistence cleared successfully");
    return true;
  } catch (error) {
    console.error("Error clearing persistence:", error);
    return false;
  }
};

// Retry mechanism for Firebase operations
export const retryOperation = async (operation: () => Promise<any>, maxRetries = 3, delay = 1000): Promise<any> => {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries}):`, error);
      lastError = error;
      
      // Wait before retrying
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)));
      }
    }
  }
  
  throw lastError;
};

// Check Firebase connection status
export const checkFirebaseConnection = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Create a reference to a test collection and document
    const testCollectionRef = collection(db, "__connectionTest__");
    const testDocRef = doc(testCollectionRef, "__connectionTest__");
    
    // Use onSnapshot to check connection
    const unsubscribe = onSnapshot(
      testDocRef,
      () => {
        unsubscribe();
        resolve(true);
      },
      (error) => {
        console.error("Firebase connection test failed:", error);
        unsubscribe();
        resolve(false);
      }
    );
    
    // Timeout after 5 seconds
    setTimeout(() => {
      unsubscribe();
      resolve(false);
    }, 5000);
  });
};

// Helper to initialize Firebase in App.tsx with proper error handling
export const initializeFirebase = async (isMobile: boolean) => {
  try {
    // If on mobile, enable offline persistence
    if (isMobile) {
      await enableOfflinePersistence();
    }
    
    // Check geolocation permissions
    const geolocationPermission = await checkGeolocationPermission();
    console.log("Geolocation permission:", geolocationPermission ? "granted" : "denied");
    
    // Setup listeners for network connectivity issues
    window.addEventListener('online', () => {
      console.log('App is online. Reconnecting to Firestore...');
      // Try to clear cache if there were sync issues
      if (localStorage.getItem('hadSyncIssues') === 'true') {
        clearPersistenceCache().then(() => {
          localStorage.removeItem('hadSyncIssues');
          window.location.reload();
        });
      }
    });
    
    window.addEventListener('offline', () => {
      console.log('App is offline. Some changes may be cached locally.');
      localStorage.setItem('hadSyncIssues', 'true');
    });
    
    return true;
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    return false;
  }
};

// Function to handle write operations with retry and better error feedback
export const firebaseWrite = async (writeOperation: () => Promise<any>): Promise<boolean> => {
  try {
    await retryOperation(writeOperation, 3, 1000);
    return true;
  } catch (error) {
    console.error("Firebase write operation failed after retries:", error);
    return false;
  }
};
