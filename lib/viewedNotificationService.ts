import { supabase } from './supabase';

export type NotificationType = 'intro_request' | 'suggestion' | 'match' | 'info_request';

class ViewedNotificationService {
  /**
   * Mark a notification as viewed
   */
  async markAsViewed(
    notificationType: NotificationType,
    notificationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { error } = await supabase
        .from('viewed_notifications')
        .upsert({
          user_id: user.id,
          notification_type: notificationType,
          notification_id: notificationId,
          viewed_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,notification_type,notification_id',
          ignoreDuplicates: false, // Update viewed_at if already exists
        });

      if (error) {
        console.error('Error marking notification as viewed:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in markAsViewed:', error);
      return { success: false, error: error.message || 'Failed to mark notification as viewed' };
    }
  }

  /**
   * Mark multiple notifications as viewed
   */
  async markMultipleAsViewed(
    notifications: Array<{ type: NotificationType; id: string }>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      if (notifications.length === 0) {
        return { success: true };
      }

      const viewedAt = new Date().toISOString();
      const records = notifications.map(n => ({
        user_id: user.id,
        notification_type: n.type,
        notification_id: n.id,
        viewed_at: viewedAt,
      }));

      const { error } = await supabase
        .from('viewed_notifications')
        .upsert(records, {
          onConflict: 'user_id,notification_type,notification_id',
          ignoreDuplicates: false,
        });

      if (error) {
        console.error('Error marking multiple notifications as viewed:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in markMultipleAsViewed:', error);
      return { success: false, error: error.message || 'Failed to mark notifications as viewed' };
    }
  }

  /**
   * Check if a notification has been viewed
   */
  async isViewed(
    notificationType: NotificationType,
    notificationId: string
  ): Promise<{ success: boolean; viewed: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, viewed: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase
        .from('viewed_notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('notification_type', notificationType)
        .eq('notification_id', notificationId)
        .maybeSingle();

      if (error) {
        console.error('Error checking if notification is viewed:', error);
        return { success: false, viewed: false, error: error.message };
      }

      return { success: true, viewed: !!data };
    } catch (error: any) {
      console.error('Error in isViewed:', error);
      return { success: false, viewed: false, error: error.message || 'Failed to check notification status' };
    }
  }

  /**
   * Get all viewed notification IDs for a specific type
   */
  async getViewedIds(
    notificationType: NotificationType
  ): Promise<{ success: boolean; ids: string[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, ids: [], error: 'Not authenticated' };
      }

      const { data, error } = await supabase
        .from('viewed_notifications')
        .select('notification_id')
        .eq('user_id', user.id)
        .eq('notification_type', notificationType);

      if (error) {
        console.error('Error getting viewed notification IDs:', error);
        return { success: false, ids: [], error: error.message };
      }

      const ids = data?.map(row => row.notification_id) || [];
      return { success: true, ids };
    } catch (error: any) {
      console.error('Error in getViewedIds:', error);
      return { success: false, ids: [], error: error.message || 'Failed to get viewed notifications' };
    }
  }

  /**
   * Clear old viewed notifications (cleanup - older than 30 days)
   */
  async clearOldViewedNotifications(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { error } = await supabase
        .from('viewed_notifications')
        .delete()
        .eq('user_id', user.id)
        .lt('viewed_at', thirtyDaysAgo.toISOString());

      if (error) {
        console.error('Error clearing old viewed notifications:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in clearOldViewedNotifications:', error);
      return { success: false, error: error.message || 'Failed to clear old notifications' };
    }
  }
}

export const viewedNotificationService = new ViewedNotificationService();

