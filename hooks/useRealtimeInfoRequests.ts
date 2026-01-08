import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useRealtimeInfoRequests(
  onUpdate: () => void,
  currentProfileId?: string
) {
  const onUpdateRef = useRef(onUpdate);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!currentProfileId) return;

    console.log(`🔔 Setting up realtime info requests for user: ${currentProfileId} (attempt ${retryCount + 1})`);

    // Subscribe to changes in info_requests table
    const channel = supabase
      .channel(`info_requests_user_${currentProfileId}_${Date.now()}`) // Add timestamp to make channel unique
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
          
          // Handle binding mismatch error by retrying
          if (err.message?.includes('mismatch between server and client bindings')) {
            console.log('⚠️ Schema mismatch detected. This usually means the table structure has changed.');
            console.log('💡 Tip: Run this SQL in Supabase to fix: ALTER TABLE info_requests REPLICA IDENTITY FULL;');
            
            // Don't retry automatically for this specific error as it requires DB changes
            // Instead, fall back to polling by triggering update
            if (retryCount < MAX_RETRIES) {
              console.log('🔄 Will use polling fallback instead of realtime for info_requests');
            }
          } else if (retryCount < MAX_RETRIES) {
            // For other errors, retry after a delay
            console.log(`🔄 Retrying subscription in 2 seconds... (${retryCount + 1}/${MAX_RETRIES})`);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 2000);
          }
        } else if (status === 'SUBSCRIBED') {
          console.log('✅ Info requests realtime subscription successful');
          setRetryCount(0); // Reset retry count on success
        }
      });

    return () => {
      console.log('🔕 Unsubscribing from info_requests_user channel');
      supabase.removeChannel(channel);
    };
  }, [currentProfileId, retryCount]);
}

