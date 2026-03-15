import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useUnreadNotificationsCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (!error && count !== null) {
        setUnreadCount(count);
      }
    } catch (error) {
      console.error('Error fetching unread notifications count:', error);
    }
  }, []);

  useEffect(() => {
    fetchCount();

    // Subscribe to new notifications in realtime
    const setupChannel = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channelRef.current = supabase
        .channel(`unread-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => fetchCount()
        )
        .subscribe();
    };

    setupChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchCount]);

  return { unreadCount, refresh: fetchCount };
}
