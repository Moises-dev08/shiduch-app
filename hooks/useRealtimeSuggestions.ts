import type { RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useRef } from 'react';
import { uniqueRealtimeTopic } from '../lib/realtimeChannel';
import { supabase } from '../lib/supabase';

interface SuggestionListener {
  profileId?: string;
  notify: () => void;
}

const listeners = new Set<SuggestionListener>();
let activeKey: string | null = null;
let activeChannel: RealtimeChannel | null = null;

function listenerKey(): string {
  let sharedProfileId: string | undefined;
  for (const listener of listeners) {
    if (!listener.profileId) return 'broad';
    if (sharedProfileId && sharedProfileId !== listener.profileId) return 'broad';
    sharedProfileId = listener.profileId;
  }
  return sharedProfileId ? `user:${sharedProfileId}` : 'broad';
}

function emitSuggestions(): void {
  listeners.forEach((listener) => listener.notify());
}

function closeActiveChannel(): void {
  if (!activeChannel) return;
  const channel = activeChannel;
  activeChannel = null;
  void supabase.removeChannel(channel);
}

/**
 * One suggestions channel for every mounted caller.
 * The tab bar and the connect screen both subscribe; a second `.channel()`
 * with the same topic returns the joined channel and `.on()` then throws.
 */
function ensureSuggestionsChannel(): void {
  if (listeners.size === 0) {
    activeKey = null;
    closeActiveChannel();
    return;
  }

  const key = listenerKey();
  if (key === activeKey && activeChannel) return;

  closeActiveChannel();
  activeKey = key;

  const profileId = key.startsWith('user:') ? key.slice('user:'.length) : undefined;
  let channel = supabase.channel(
    uniqueRealtimeTopic(profileId ? `suggestions-user-${profileId}` : 'suggestions-all'),
  );

  if (!profileId) {
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'suggestions' },
      (payload) => {
        console.log('🔔 Suggestion change (broad):', payload.eventType);
        emitSuggestions();
      },
    );
  } else {
    channel = channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suggestions',
          filter: `suggester_id=eq.${profileId}`,
        },
        (payload) => {
          console.log('🔔 Suggestion change (as suggester):', payload.eventType);
          emitSuggestions();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suggestions',
          filter: `profile_one_id=eq.${profileId}`,
        },
        (payload) => {
          console.log('🔔 Suggestion change (as profile_one):', payload.eventType);
          emitSuggestions();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suggestions',
          filter: `profile_two_id=eq.${profileId}`,
        },
        (payload) => {
          console.log('🔔 Suggestion change (as profile_two):', payload.eventType);
          emitSuggestions();
        },
      );
  }

  activeChannel = channel.subscribe((status) => {
    console.log(`🔔 Suggestions subscription status: ${status}`);
  });
}

/**
 * Custom hook to subscribe to real-time updates for the 'suggestions' table.
 * When profileId is available, uses filtered per-user channels.
 * When profileId is not yet available, falls back to a broad unfiltered subscription
 * so no INSERT events are missed during the initial profile load window.
 */
export function useRealtimeSuggestions(onUpdate: () => void, currentProfileId?: string): void {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    const listener: SuggestionListener = {
      profileId: currentProfileId,
      notify: () => onUpdateRef.current(),
    };
    listeners.add(listener);
    ensureSuggestionsChannel();

    return () => {
      listeners.delete(listener);
      ensureSuggestionsChannel();
    };
  }, [currentProfileId]);
}
