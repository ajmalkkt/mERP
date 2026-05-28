import { useState, useCallback } from 'react';

interface UseFetchOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

/**
 * Custom hook for handling API calls with loading and error states
 */
export function useFetch(options?: UseFetchOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  const execute = useCallback(
    async (apiCall: () => Promise<any>) => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiCall();
        setData(result);
        options?.onSuccess?.(result);
        return result;
      } catch (err: any) {
        const errorMessage = err?.message || 'An error occurred';
        setError(errorMessage);
        options?.onError?.(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  return {
    loading,
    error,
    data,
    execute,
    setLoading,
    setError,
    setData,
  };
}
