import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { isNativePushNotificationsSupported } from './pushNotificationsPlatform';
import { supabase, supabaseUrl } from './supabase';

// Configure how notifications are handled when app is in foreground
if (isNativePushNotificationsSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

class NotificationService {
  /**
   * Register for push notifications and save token
   */
  async registerForPushNotifications(): Promise<string | null> {
    if (!isNativePushNotificationsSupported) {
      return null;
    }

    try {
      // Check if physical device
      if (!Device.isDevice) {
        console.log('Must use physical device for push notifications');
        return null;
      }

      // Check if running in Expo Go (push notifications not supported in SDK 53+)
      // Try to detect Expo Go by checking execution environment
      try {
        const executionEnvironment = Constants.executionEnvironment;
        // StoreClient means Expo Go
        if (executionEnvironment === Constants.ExecutionEnvironment?.StoreClient) {
          console.warn(
            '⚠️ Push notifications are not supported in Expo Go (SDK 53+).\n' +
            'To test push notifications, use a development build:\n' +
            '• iOS: npx expo run:ios\n' +
            '• Android: npx expo run:android\n' +
            '• Or: eas build --profile development --platform ios/android'
          );
          return null;
        }
      } catch (e) {
        // ExecutionEnvironment might not be available in all versions, continue
      }

      // Get permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permission not granted for notifications');
        return null;
      }

      // Get push token with projectId from app.json
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      
      if (!projectId) {
        console.error('EAS projectId not found in app.json. Push notifications require a projectId.');
        return null;
      }

      let tokenData;
      try {
        tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        });
      } catch (tokenError: any) {
        // Check if error is about Expo Go (SDK 53+ removed push notifications from Expo Go)
        const errorMessage = tokenError?.message || String(tokenError);
        if (
          errorMessage.includes('Expo Go') || 
          errorMessage.includes('development build') ||
          errorMessage.includes('SDK 53') ||
          errorMessage.includes('remote notifications')
        ) {
          console.warn(
            '⚠️ Push notifications are not supported in Expo Go (SDK 53+).\n' +
            'To test push notifications, use a development build:\n' +
            '• iOS: npx expo run:ios\n' +
            '• Android: npx expo run:android\n' +
            '• Or: eas build --profile development --platform ios/android\n' +
            'Read more: https://docs.expo.dev/develop/development-builds/introduction/'
          );
          return null;
        }
        // Re-throw other errors
        console.error('Error getting push token:', tokenError);
        throw tokenError;
      }

      const token = tokenData.data;

      // Save token to database
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await this.savePushToken(token, user.id);
      }

      // Set notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          showBadge: true,
        });
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Remove all push tokens for the current device on logout
   */
  async removePushToken(): Promise<void> {
    if (!isNativePushNotificationsSupported) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let currentToken: string | null = null;
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        if (projectId && Device.isDevice) {
          const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
          currentToken = tokenData.data;
        }
      } catch {
        // Token may not be available (Expo Go, permissions revoked, etc.)
      }

      if (currentToken) {
        await supabase
          .from('push_tokens')
          .delete()
          .eq('user_id', user.id)
          .eq('token', currentToken);
      }
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  }

  /**
   * Save push token to database
   */
  async savePushToken(token: string, userId: string): Promise<void> {
    try {
      const deviceName = `${Device.brand} ${Device.modelName}`;

      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: userId,
          token: token,
          device_name: deviceName,
        }, {
          onConflict: 'user_id,token',
        });

      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('Push token saved successfully');
      }
    } catch (error) {
      console.error('Error in savePushToken:', error);
    }
  }

  /**
   * Send notification via Edge Function
   */
  async sendNotification(
    userId: string,
    title: string,
    body: string,
    data?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      let response: Response;
      try {
        response = await fetch(
          `${supabaseUrl}/functions/v1/send-notification`,
          {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId,
              title,
              body,
              data,
            }),
          }
        );
      } finally {
        clearTimeout(timeoutId);
      }

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to send notification' };
      }

      return { success: true };
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.warn('sendNotification timed out after 8s');
        return { success: false, error: 'Request timed out' };
      }
      console.error('Error sending notification:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Parse RPC result: PostgREST may return [{ user_id }, …] or, in edge cases, uuid[].
   */
  private parseAdminUserIdsFromRpc(data: unknown): string[] {
    if (!data || !Array.isArray(data)) return [];
    const ids: string[] = [];
    for (const row of data) {
      if (typeof row === 'string' && row.length > 0) {
        ids.push(row);
      } else if (row && typeof row === 'object' && 'user_id' in row) {
        const id = (row as { user_id: string }).user_id;
        if (typeof id === 'string' && id.length > 0) ids.push(id);
      }
    }
    return [...new Set(ids)];
  }

  /**
   * Get all admin user IDs
   */
  async getAdminUserIds(): Promise<string[]> {
    try {
      // Use RPC: RLS on admin_users only allows each admin to see their own row,
      // so a direct select returns no IDs for normal users and breaks notifyAdmins.
      const { data, error } = await supabase.rpc('get_admin_user_ids');

      if (error) {
        console.error('Error fetching admin users:', error);
        return [];
      }

      return this.parseAdminUserIdsFromRpc(data);
    } catch (error) {
      console.error('Error in getAdminUserIds:', error);
      return [];
    }
  }

  /**
   * Notify all admins (e.g. moderation). Optionally skip ids (e.g. never notify the submitter).
   */
  async notifyAdmins(
    title: string,
    body: string,
    data?: any,
    options?: { excludeUserIds?: string[] }
  ): Promise<void> {
    try {
      const exclude = new Set(
        (options?.excludeUserIds ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0)
      );
      const adminIds = (await this.getAdminUserIds()).filter((id) => !exclude.has(id));

      await Promise.allSettled(
        adminIds.map((adminId) => this.sendNotification(adminId, title, body, data))
      );
    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  }

  /**
   * Notify all active users except the ones listed in excludeUserIds.
   * Used for community-wide announcements (e.g. new engagement news).
   */
  async notifyAllUsersExcept(
    excludeUserIds: string[],
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('status', 'approved')
        .not('user_id', 'in', `(${excludeUserIds.join(',')})`);

      if (error || !profiles) {
        console.error('Error fetching users for broadcast:', error);
        return;
      }

      await Promise.allSettled(
        profiles.map((profile) => this.sendNotification(profile.user_id, title, body, data))
      );
    } catch (error) {
      console.error('Error in notifyAllUsersExcept:', error);
    }
  }

  /**
   * Get user's notifications.
   * Always filters by the current user's id so the correct rows are returned
   * regardless of whether RLS is enabled on the notifications table.
   * Also normalises the `data` field: edge functions sometimes store it as a
   * JSON string instead of a JSONB object — we parse it here so all consumers
   * can safely use `notification.data?.type` without extra guards.
   */
  async getNotifications(): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      // Normalise the `data` field: parse JSON strings into objects
      return (data || []).map((n) => ({
        ...n,
        data: typeof n.data === 'string' ? (() => { try { return JSON.parse(n.data); } catch { return {}; } })() : (n.data ?? {}),
      }));
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }
}

export const notificationService = new NotificationService();

