import { useEffect } from 'react';
import { realtimeService } from '../lib/realtimeService';

/**
 * Hook to subscribe to real-time profile updates
 * Automatically refreshes data when profiles table changes
 */
export function useRealtimeProfiles(onUpdate: () => void) {
  useEffect(() => {
    console.log('Setting up real-time profiles subscription');
    
    const unsubscribe = realtimeService.subscribeToProfiles((payload) => {
      // Call the update callback whenever a profile changes
      console.log('Profile updated in real-time:', payload.eventType);
      onUpdate();
    });

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up real-time profiles subscription');
      unsubscribe();
    };
  }, [onUpdate]);
}

