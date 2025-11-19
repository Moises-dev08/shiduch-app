import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtimeInfoRequests(
  onUpdate: () => void,
  currentProfileId?: string
) {
  const onUpdateRef = useRef(onUpdate);
  
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!currentProfileId) return;

    console.log(`🔔 Setting up realtime info requests for user: ${currentProfileId}`);

    // Subscribe to changes in info_requests table
    const channel = supabase
      .channel(`info_requests_user_${currentProfileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'info_requests',
          filter: `requested_profile_id=eq.${currentProfileId}`,
        },
        (payload) => {
          console.log('🔔 Info request change detected (as requested):', payload);
          onUpdateRef.current();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'info_requests',
          filter: `requester_id=eq.${currentProfileId}`,
        },
        (payload) => {
          console.log('🔔 Info request change detected (as requester):', payload);
          onUpdateRef.current();
        }
      )
      .subscribe((status, err) => {
        console.log(`🔔 Info requests subscription status: ${status}`);
        if (err) {
          console.error('Info requests subscription error:', err);
        }
      });

    return () => {
      console.log('🔕 Unsubscribing from info_requests_user channel');
      supabase.removeChannel(channel);
    };
  }, [currentProfileId]);
}

