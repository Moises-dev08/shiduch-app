import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase, supabaseUrl } from './supabase';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  /**
   * Register for push notifications and save token
   */
  async registerForPushNotifications(): Promise<string | null> {
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
        });
      }

      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
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

      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-notification`,
        {
          method: 'POST',
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

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to send notification' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending notification:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get all admin user IDs
   */
  async getAdminUserIds(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id');

      if (error || !data) {
        console.error('Error fetching admin users:', error);
        return [];
      }

      return data.map(admin => admin.user_id);
    } catch (error) {
      console.error('Error in getAdminUserIds:', error);
      return [];
    }
  }

  /**
   * Notify all admins
   */
  async notifyAdmins(title: string, body: string, data?: any): Promise<void> {
    try {
      const adminIds = await this.getAdminUserIds();

      for (const adminId of adminIds) {
        await this.sendNotification(adminId, title, body, data);
      }
    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  }

  /**
   * Get user's notifications
   */
  async getNotifications(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
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

