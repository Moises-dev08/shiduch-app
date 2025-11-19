import { useEffect, useRef } from 'react';
import { realtimeService } from '../lib/realtimeService';

/**
 * Hook to subscribe to real-time profile updates
 * Automatically refreshes data when profiles table changes
 */
export function useRealtimeProfiles(onUpdate: () => void) {
  const onUpdateRef = useRef(onUpdate);
  
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    console.log('🔔 Setting up real-time profiles subscription');
    
    const unsubscribe = realtimeService.subscribeToProfiles((payload) => {
      // Call the update callback whenever a profile changes
      console.log('🔔 Profile updated in real-time:', payload.eventType);
      onUpdateRef.current();
    });

    // Cleanup subscription on unmount
    return () => {
      console.log('🔕 Cleaning up real-time profiles subscription');
      unsubscribe();
    };
  }, []); // Empty deps - subscription stays active for component lifetime
}

