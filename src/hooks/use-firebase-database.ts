
import { useState, useEffect, useCallback } from 'react';
import { 
  ref, 
  get, 
  set, 
  update, 
  remove, 
  push,
  onValue, 
  off,
  query,
  orderByChild,
  equalTo,
  DatabaseReference
} from 'firebase/database';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface FirebaseDatabaseOptions {
  path: string;
  realtime?: boolean;
  orderBy?: string;
  equalToValue?: any;
  notifyOnSuccess?: boolean;
  notifyOnError?: boolean;
}

export function useFirebaseDatabase<T = any>(options: FirebaseDatabaseOptions) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const dbRef = useCallback(() => {
    let reference = ref(db, options.path);
    
    if (options.orderBy && options.equalToValue !== undefined) {
      return query(reference, orderByChild(options.orderBy), equalTo(options.equalToValue));
    } else if (options.orderBy) {
      return query(reference, orderByChild(options.orderBy));
    }
    
    return reference;
  }, [options.path, options.orderBy, options.equalToValue]);

  // Fetch data once
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const snapshot = await get(dbRef());
      
      if (snapshot.exists()) {
        // Handle both array and object data structures
        if (snapshot.key === 'length' || !isNaN(Number(snapshot.key))) {
          // It's likely an array
          const dataArray: T[] = [];
          snapshot.forEach((childSnapshot) => {
            dataArray.push({
              id: childSnapshot.key,
              ...childSnapshot.val()
            } as any);
          });
          setData(dataArray as unknown as T);
        } else {
          // It's an object
          setData({ id: snapshot.key, ...snapshot.val() } as T);
        }
      } else {
        setData(null);
      }
      
      if (options.notifyOnSuccess) {
        toast({
          title: "Data loaded successfully",
        });
      }
      
      return true;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to fetch data";
      setError(new Error(errorMessage));
      console.error("Error fetching data:", err);
      
      if (options.notifyOnError) {
        toast({
          title: "Error loading data",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dbRef, toast, options.notifyOnSuccess, options.notifyOnError]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (options.realtime) {
      setIsLoading(true);
      
      const reference = dbRef();
      
      const handleDataChange = (snapshot: any) => {
        if (snapshot.exists()) {
          // Handle both array and object data structures
          if (Array.isArray(snapshot.val())) {
            // It's an array
            setData(snapshot.val() as T);
          } else if (snapshot.key === 'length' || !isNaN(Number(snapshot.key))) {
            // It might be array-like
            const dataArray: any[] = [];
            snapshot.forEach((childSnapshot: any) => {
              dataArray.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
              });
            });
            setData(dataArray as unknown as T);
          } else {
            // It's an object
            setData({ id: snapshot.key, ...snapshot.val() } as T);
          }
        } else {
          setData(null);
        }
        
        setIsLoading(false);
      };
      
      const handleError = (err: Error) => {
        setError(err);
        setIsLoading(false);
        
        if (options.notifyOnError) {
          toast({
            title: "Error loading data",
            description: err.message,
            variant: "destructive",
          });
        }
      };
      
      onValue(reference, handleDataChange, handleError);
      
      return () => {
        off(reference);
      };
    } else {
      // If not real-time, fetch once
      fetchData();
    }
  }, [dbRef, fetchData, options.realtime, options.notifyOnError, toast]);

  // Function to add new data
  const addData = useCallback(async (newData: Partial<T>) => {
    try {
      const reference = ref(db, options.path);
      const newRef = push(reference);
      await set(newRef, newData);
      
      if (options.notifyOnSuccess) {
        toast({
          title: "Data added successfully",
        });
      }
      
      if (!options.realtime) {
        await fetchData();
      }
      
      return newRef.key;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to add data";
      console.error("Error adding data:", err);
      
      if (options.notifyOnError) {
        toast({
          title: "Error adding data",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      throw err;
    }
  }, [options.path, fetchData, options.realtime, options.notifyOnSuccess, options.notifyOnError, toast]);

  // Function to update existing data
  const updateData = useCallback(async (id: string, updates: Partial<T>) => {
    const itemPath = `${options.path}/${id}`;
    
    try {
      const reference = ref(db, itemPath);
      await update(reference, updates as object);
      
      if (options.notifyOnSuccess) {
        toast({
          title: "Data updated successfully",
        });
      }
      
      if (!options.realtime) {
        await fetchData();
      }
      
      return true;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to update data";
      console.error("Error updating data:", err);
      
      if (options.notifyOnError) {
        toast({
          title: "Error updating data",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      throw err;
    }
  }, [options.path, fetchData, options.realtime, options.notifyOnSuccess, options.notifyOnError, toast]);

  // Function to remove data
  const removeData = useCallback(async (id: string) => {
    const itemPath = `${options.path}/${id}`;
    
    try {
      const reference = ref(db, itemPath);
      await remove(reference);
      
      if (options.notifyOnSuccess) {
        toast({
          title: "Data removed successfully",
        });
      }
      
      if (!options.realtime) {
        await fetchData();
      }
      
      return true;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to remove data";
      console.error("Error removing data:", err);
      
      if (options.notifyOnError) {
        toast({
          title: "Error removing data",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      throw err;
    }
  }, [options.path, fetchData, options.realtime, options.notifyOnSuccess, options.notifyOnError, toast]);

  // Set data directly
  const setDirectData = useCallback(async (value: any) => {
    try {
      const reference = ref(db, options.path);
      await set(reference, value);
      
      if (options.notifyOnSuccess) {
        toast({
          title: "Data set successfully",
        });
      }
      
      if (!options.realtime) {
        await fetchData();
      }
      
      return true;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to set data";
      console.error("Error setting data:", err);
      
      if (options.notifyOnError) {
        toast({
          title: "Error setting data",
          description: errorMessage,
          variant: "destructive",
        });
      }
      
      throw err;
    }
  }, [options.path, fetchData, options.realtime, options.notifyOnSuccess, options.notifyOnError, toast]);

  // Update location function (new addition)
  const updateLocation = useCallback(async (id: string, latitude: number, longitude: number) => {
    const itemPath = `${options.path}/${id}`;
    
    try {
      const reference = ref(db, itemPath);
      await update(reference, {
        location: {
          latitude,
          longitude,
          lastUpdated: new Date().toISOString()
        }
      });
      
      return true;
    } catch (err: any) {
      console.error("Error updating location:", err);
      throw err;
    }
  }, [options.path]);
  
  // Location tracker with interval (new addition)
  const startLocationTracking = useCallback((id: string, getCurrentLocation: () => Promise<{latitude: number, longitude: number}>, intervalMs: number = 120000) => {
    let intervalId: number | null = null;
    
    const trackLocation = async () => {
      try {
        const location = await getCurrentLocation();
        await updateLocation(id, location.latitude, location.longitude);
      } catch (error) {
        console.error("Error in location tracking:", error);
      }
    };
    
    // Start tracking
    intervalId = window.setInterval(trackLocation, intervalMs);
    
    // Initial update
    trackLocation();
    
    // Return function to stop tracking
    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [updateLocation]);

  return {
    data,
    isLoading,
    error,
    fetchData,
    addData,
    updateData,
    removeData,
    setData: setDirectData,
    refresh: fetchData,
    updateLocation,
    startLocationTracking
  };
}
