import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { loadNotificationsModule } from '../lib/pushNotificationsPlatform';
import { supabase } from '../lib/supabase';

const QUERY_KEY = ['unread_count'] as const;

async function fetchUnreadCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
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
export function useUnreadNotificationsCount() {
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
  useEffect(() => {
    let channelName: string | null = null;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channelName = `unread-notifications-${user.id}`;
      supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            // No server-side filter — handled client-side below
          },
          (payload) => {
            const rowUserId = (payload.new as any)?.user_id ?? (payload.old as any)?.user_id;
            // Only invalidate when the changed row belongs to the current user,
            // or when the payload doesn't expose the user_id (e.g. no REPLICA IDENTITY FULL)
            if (!rowUserId || rowUserId === user.id) {
              queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            }
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channelName) {
        const ch = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
        if (ch) supabase.removeChannel(ch);
      }
    };
  }, [queryClient]);

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
