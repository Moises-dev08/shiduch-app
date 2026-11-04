import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { loadNotificationsModule } from '../lib/pushNotificationsPlatform';
import { uniqueRealtimeTopic } from '../lib/realtimeChannel';
import { supabase } from '../lib/supabase';

const QUERY_KEY = ['unread_count'] as const;

interface NotificationRow {
  user_id?: string;
}

interface UnreadNotificationsCount {
  unreadCount: number;
  refresh: () => void;
}

let subscriberCount = 0;
let startGeneration = 0;
let unreadChannel: RealtimeChannel | null = null;
let boundQueryClient: QueryClient | null = null;

function userIdFromRow(row: object): string | undefined {
  if ('user_id' in row && typeof row.user_id === 'string') return row.user_id;
  return undefined;
}

function notificationUserId(
  payload: RealtimePostgresChangesPayload<NotificationRow>,
): string | undefined {
  return userIdFromRow(payload.new) ?? userIdFromRow(payload.old);
}

function stopUnreadChannel(): void {
  startGeneration += 1;
  const channel = unreadChannel;
  unreadChannel = null;
  if (channel) {
    void supabase.removeChannel(channel);
  }
}

async function startUnreadChannel(queryClient: QueryClient): Promise<void> {
  const generation = ++startGeneration;
  boundQueryClient = queryClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (generation !== startGeneration || subscriberCount === 0 || !user) return;

  const channel = supabase
    .channel(uniqueRealtimeTopic(`unread-notifications-${user.id}`))
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
      },
      (payload) => {
        const rowUserId = notificationUserId(payload);
        if (!rowUserId || rowUserId === user.id) {
          boundQueryClient?.invalidateQueries({ queryKey: QUERY_KEY });
        }
      },
    )
    .subscribe();

  if (generation !== startGeneration || subscriberCount === 0) {
    void supabase.removeChannel(channel);
    return;
  }

  unreadChannel = channel;
}

/**
 * Home, the notification panel, and the notifications tab all call this hook.
 * They share one channel. A second `postgres_changes` binding on a topic that
 * already subscribed throws on web.
 */
function retainUnreadChannel(queryClient: QueryClient): () => void {
  subscriberCount += 1;
  boundQueryClient = queryClient;
  if (!unreadChannel) {
    void startUnreadChannel(queryClient);
  }

  return () => {
    subscriberCount -= 1;
    if (subscriberCount === 0) {
      stopUnreadChannel();
    }
  };
}

async function fetchUnreadCount(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('read', false);

  if (error || count === null) return 0;
  return count;
}

/**
 * Returns the unread notification count backed by React Query.
 * Because it uses a shared query key ['unread_count'], ANY call to
 * queryClient.invalidateQueries({ queryKey: ['unread_count'] }) from
 * anywhere in the app (panel, connect tab, etc.) instantly updates
 * every badge that consumes this hook.
 */
export function useUnreadNotificationsCount(): UnreadNotificationsCount {
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchUnreadCount,
    staleTime: 30 * 1000,
    // Poll every 20 s as a safety net in case the realtime event is missed
    refetchInterval: 20 * 1000,
  });

  // Realtime: invalidate the count the moment a notification row is inserted or
  // updated for this user.
  //
  // NOTE: Supabase postgres_changes with a server-side `filter` requires
  // REPLICA IDENTITY FULL on the table. Without it the filtered subscription
  // silently fires no events. We therefore subscribe WITHOUT a server-side
  // filter and compare user_id client-side — the `fetchUnreadCount` query
  // already enforces the correct user via .eq('user_id', user.id).
  useEffect(() => retainUnreadChannel(queryClient), [queryClient]);

  // Keep the app icon badge in sync with the unread count
  useEffect(() => {
    const notifications = loadNotificationsModule();
    if (!notifications) return;
    notifications.setBadgeCountAsync(unreadCount).catch(() => {});
  }, [unreadCount]);

  return {
    unreadCount,
    refresh: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  };
}

/** Exported so panels/tabs can invalidate the badge without importing the hook */
export const UNREAD_COUNT_QUERY_KEY = QUERY_KEY;
