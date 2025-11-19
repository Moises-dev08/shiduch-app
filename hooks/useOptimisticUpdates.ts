/**
 * Hook for managing optimistic updates and background data fetching
 * This ensures fresh data without showing loading states to the user
 */

import { useCallback, useRef } from 'react';

interface UseOptimisticUpdatesOptions<T> {
  data: T;
  setData: (data: T) => void;
  fetchData: () => Promise<T | null>;
  onError?: (error: Error) => void;
}

export function useOptimisticUpdates<T>({
  data,
  setData,
  fetchData,
  onError,
}: UseOptimisticUpdatesOptions<T>) {
  const isFetchingRef = useRef(false);
  const lastFetchRef = useRef<number>(0);
  const DEBOUNCE_MS = 1000; // Prevent too frequent updates

  /**
   * Silently refetch data in the background without showing loading state
   */
  const silentRefetch = useCallback(async () => {
    const now = Date.now();
    
    // Debounce: Don't refetch if we just fetched
    if (now - lastFetchRef.current < DEBOUNCE_MS) {
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      lastFetchRef.current = now;

      const freshData = await fetchData();
      
      if (freshData !== null) {
        setData(freshData);
      }
    } catch (error) {
      console.error('Background refetch error:', error);
      onError?.(error as Error);
    } finally {
      isFetchingRef.current = false;
    }
  }, [fetchData, setData, onError]);

  /**
   * Optimistically update local data, then sync with server
   */
  const optimisticUpdate = useCallback(
    async (updater: (current: T) => T, serverUpdate: () => Promise<void>) => {
      // Store original data for rollback
      const originalData = data;

      try {
        // Apply optimistic update immediately
        const newData = updater(data);
        setData(newData);

        // Perform server update
        await serverUpdate();

        // Silently refetch to ensure consistency
        await silentRefetch();
      } catch (error) {
        console.error('Optimistic update failed, rolling back:', error);
        // Rollback on error
        setData(originalData);
        onError?.(error as Error);
      }
    },
    [data, setData, silentRefetch, onError]
  );

  return {
    silentRefetch,
    optimisticUpdate,
  };
}

