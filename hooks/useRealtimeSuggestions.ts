import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Custom hook to subscribe to real-time updates for the 'suggestions' table.
 * When profileId is available, uses filtered per-user channels.
 * When profileId is not yet available, falls back to a broad unfiltered subscription
 * so no INSERT events are missed during the initial profile load window.
 */
export function useRealtimeSuggestions(onUpdate: () => void, currentProfileId?: string) {
  const onUpdateRef = useRef(onUpdate);
  
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!currentProfileId) {
      // Broad fallback: subscribe to ALL suggestion changes until profileId loads
      console.log('🔔 Setting up broad suggestions subscription (profileId not yet available)');
      const channel = supabase
        .channel('suggestions-all-fallback')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'suggestions' }, (payload) => {
          console.log('🔔 Suggestion change (broad):', payload.eventType);
          onUpdateRef.current();
        })
        .subscribe((status) => console.log(`🔔 Suggestions (broad) status: ${status}`));

      return () => {
        supabase.removeChannel(channel);
      };
    }

    console.log(`🔔 Setting up real-time suggestions subscription for user: ${currentProfileId}`);

    const channelName = `suggestions-user-${currentProfileId}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'suggestions',
        filter: `suggester_id=eq.${currentProfileId}`,
      }, (payload) => {
        console.log('🔔 Suggestion change (as suggester):', payload.eventType);
        onUpdateRef.current();
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'suggestions',
        filter: `profile_one_id=eq.${currentProfileId}`,
      }, (payload) => {
        console.log('🔔 Suggestion change (as profile_one):', payload.eventType);
        onUpdateRef.current();
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'suggestions',
        filter: `profile_two_id=eq.${currentProfileId}`,
      }, (payload) => {
        console.log('🔔 Suggestion change (as profile_two):', payload.eventType);
        onUpdateRef.current();
      })
      .subscribe((status) => console.log(`🔔 Suggestions subscription status: ${status}`));

    return () => {
      console.log(`🔕 Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [currentProfileId]);
}

