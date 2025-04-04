
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { retryOperation } from '@/lib/firebase';

type OperationStatus = 'idle' | 'loading' | 'success' | 'error';

interface UseFirebaseOperationResult<T> {
  execute: (params?: any) => Promise<T | null>;
  status: OperationStatus;
  error: Error | null;
  reset: () => void;
}

/**
 * A hook to handle Firebase operations with retry mechanism and error handling
 * @param operation The Firebase operation to execute
 * @param successMessage Optional success message to show
 * @param errorMessage Optional error message to show
 * @param maxRetries Maximum number of retries (default: 3)
 */
export function useFirebaseOperation<T>(
  operation: (params?: any) => Promise<T>,
  successMessage?: string,
  errorMessage?: string,
  maxRetries: number = 3
): UseFirebaseOperationResult<T> {
  const [status, setStatus] = useState<OperationStatus>('idle');
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const execute = async (params?: any): Promise<T | null> => {
    try {
      setStatus('loading');
      setError(null);
      
      // Add small delay to prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await retryOperation(
        () => operation(params), 
        maxRetries
      );
      
      setStatus('success');
      
      if (successMessage) {
        toast({
          title: "Success",
          description: successMessage,
        });
      }
      
      return result;
    } catch (err) {
      setStatus('error');
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      
      toast({
        title: "Error",
        description: errorMessage || error.message,
        variant: "destructive",
      });
      
      console.error("Firebase operation failed:", error);
      return null;
    }
  };

  const reset = () => {
    setStatus('idle');
    setError(null);
  };

  return { execute, status, error, reset };
}

export default useFirebaseOperation;
