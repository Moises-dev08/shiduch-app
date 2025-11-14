import { useEffect, useRef } from 'react';
import { realtimeService } from '../lib/realtimeService';

/**
 * Hook to subscribe to real-time intro request updates
 * Optionally filter by profile ID to only get relevant updates
 */
export function useRealtimeIntroRequests(
  onUpdate: () => void,
  profileId?: string
) {
  // Use ref to keep the latest callback without recreating subscription
  const onUpdateRef = useRef(onUpdate);
  
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!profileId) {
      // Subscribe to all intro requests
      console.log('🔔 Setting up real-time intro requests subscription (all)');
      
      const unsubscribe = realtimeService.subscribeToIntroRequests((payload) => {
        console.log('🔔 Intro request updated in real-time:', payload.eventType, payload.new);
        onUpdateRef.current();
      });

      return () => {
        console.log('🔕 Cleaning up real-time intro requests subscription');
        unsubscribe();
      };
    } else {
      // Subscribe to user-specific intro requests
      console.log(`🔔 Setting up real-time intro requests subscription for user: ${profileId}`);
      
      const unsubscribe = realtimeService.subscribeToMyIntroRequests(
        profileId,
        (payload) => {
          console.log('🔔 My intro request updated in real-time:', payload.eventType, payload.new);
          onUpdateRef.current();
        }
      );

      return () => {
        console.log('🔕 Cleaning up real-time user intro requests subscription');
        unsubscribe();
      };
    }
  }, [profileId]);
}

