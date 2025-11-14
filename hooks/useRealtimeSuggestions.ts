import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Custom hook to subscribe to real-time updates for the 'suggestions' table.
 * It subscribes to changes where the current user is either profile_one, profile_two, or the suggester.
 * @param onUpdate Callback function to be called when a suggestion update is received.
 * @param currentProfileId The ID of the current user's profile.
 */
export function useRealtimeSuggestions(onUpdate: () => void, currentProfileId?: string) {
  // Use ref to keep the latest callback without recreating subscription
  const onUpdateRef = useRef(onUpdate);
  
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!currentProfileId) {
      return;
    }

    console.log(`🔔 Setting up real-time suggestions subscription for user: ${currentProfileId}`);

    // Create a channel with multiple subscriptions for each role
    const channelName = `suggestions-user-${currentProfileId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suggestions',
          filter: `suggester_id=eq.${currentProfileId}`,
        },
        (payload) => {
          console.log('🔔 Suggestion change (as suggester):', payload.eventType, payload.new);
          onUpdateRef.current();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suggestions',
          filter: `profile_one_id=eq.${currentProfileId}`,
        },
        (payload) => {
          console.log('🔔 Suggestion change (as profile_one):', payload.eventType, payload.new);
          onUpdateRef.current();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suggestions',
          filter: `profile_two_id=eq.${currentProfileId}`,
        },
        (payload) => {
          console.log('🔔 Suggestion change (as profile_two):', payload.eventType, payload.new);
          onUpdateRef.current();
        }
      )
      .subscribe((status) => {
        console.log(`🔔 Suggestions subscription status: ${status}`);
      });

    return () => {
      console.log(`🔕 Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [currentProfileId]);
}

