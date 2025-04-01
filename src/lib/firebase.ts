
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
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
