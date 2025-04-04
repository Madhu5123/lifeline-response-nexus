
import { 
  ref, 
  onValue, 
  off, 
  update, 
  get, 
  set, 
  remove, 
  push,
  query, 
  orderByChild, 
  equalTo,
  Database
} from 'firebase/database';
import { db } from '@/lib/firebase';

// Helper function to convert Firebase snapshot to an array of items with IDs
export const snapshotToArray = <T extends object>(snapshot: any): T[] => {
  const items: T[] = [];
  
  snapshot.forEach((childSnapshot: any) => {
    items.push({
      id: childSnapshot.key,
      ...childSnapshot.val()
    } as T);
  });
  
  return items;
};

// Get data once
export const fetchData = async <T extends object>(path: string): Promise<T | null> => {
  try {
    const dataRef = ref(db, path);
    const snapshot = await get(dataRef);
    
    if (snapshot.exists()) {
      return { id: snapshot.key, ...snapshot.val() } as T;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching data from ${path}:`, error);
    throw error;
  }
};

// Get a collection of data once
export const fetchCollection = async <T extends object>(
  path: string,
  orderBy?: string,
  equalToValue?: any
): Promise<T[]> => {
  try {
    let dataRef;
    
    if (orderBy && equalToValue !== undefined) {
      dataRef = query(ref(db, path), orderByChild(orderBy), equalTo(equalToValue));
    } else if (orderBy) {
      dataRef = query(ref(db, path), orderByChild(orderBy));
    } else {
      dataRef = ref(db, path);
    }
    
    const snapshot = await get(dataRef);
    return snapshotToArray<T>(snapshot);
  } catch (error) {
    console.error(`Error fetching collection from ${path}:`, error);
    throw error;
  }
};

// Listen to real-time updates
export const subscribeToData = <T extends object>(
  path: string,
  callback: (data: T | null) => void,
  errorCallback?: (error: Error) => void
): () => void => {
  const dataRef = ref(db, path);
  
  const handleDataChange = (snapshot: any) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.key, ...snapshot.val() } as T);
    } else {
      callback(null);
    }
  };
  
  const handleError = (error: Error) => {
    console.error(`Error in data subscription to ${path}:`, error);
    if (errorCallback) errorCallback(error);
  };
  
  onValue(dataRef, handleDataChange, handleError);
  
  // Return unsubscribe function
  return () => off(dataRef);
};

// Listen to real-time updates for a collection
export const subscribeToCollection = <T extends object>(
  path: string,
  callback: (data: T[]) => void,
  orderBy?: string,
  equalToValue?: any,
  errorCallback?: (error: Error) => void
): () => void => {
  let dataRef;
  
  if (orderBy && equalToValue !== undefined) {
    dataRef = query(ref(db, path), orderByChild(orderBy), equalTo(equalToValue));
  } else if (orderBy) {
    dataRef = query(ref(db, path), orderByChild(orderBy));
  } else {
    dataRef = ref(db, path);
  }
  
  const handleDataChange = (snapshot: any) => {
    callback(snapshotToArray<T>(snapshot));
  };
  
  const handleError = (error: Error) => {
    console.error(`Error in collection subscription to ${path}:`, error);
    if (errorCallback) errorCallback(error);
  };
  
  onValue(dataRef, handleDataChange, handleError);
  
  // Return unsubscribe function
  return () => off(dataRef);
};

// Update data
export const updateData = async (path: string, data: any): Promise<void> => {
  try {
    const dataRef = ref(db, path);
    await update(dataRef, data);
  } catch (error) {
    console.error(`Error updating data at ${path}:`, error);
    throw error;
  }
};

// Set data (overwrite)
export const setData = async (path: string, data: any): Promise<void> => {
  try {
    const dataRef = ref(db, path);
    await set(dataRef, data);
  } catch (error) {
    console.error(`Error setting data at ${path}:`, error);
    throw error;
  }
};

// Add data to a collection with auto-generated ID
export const addData = async (path: string, data: any): Promise<string> => {
  try {
    const collectionRef = ref(db, path);
    const newRef = push(collectionRef);
    await set(newRef, data);
    return newRef.key || '';
  } catch (error) {
    console.error(`Error adding data to ${path}:`, error);
    throw error;
  }
};

// Remove data
export const removeData = async (path: string): Promise<void> => {
  try {
    const dataRef = ref(db, path);
    await remove(dataRef);
  } catch (error) {
    console.error(`Error removing data at ${path}:`, error);
    throw error;
  }
};
