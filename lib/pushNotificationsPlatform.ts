import Constants from 'expo-constants';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

/**
 * Expo Go on Android throws as soon as expo-notifications is imported (SDK 53+).
 * The module must be loaded with require(), and only when this is false.
 */
export const isExpoGoAndroid =
  Platform.OS === 'android' && Constants.executionEnvironment === 'storeClient';

/** Push APIs are unavailable on web and in Expo Go on Android. */
export const isNativePushNotificationsSupported =
  Platform.OS !== 'web' && !isExpoGoAndroid;

let notificationsModule: NotificationsModule | null | undefined;

export function loadNotificationsModule(): NotificationsModule | null {
  if (!isNativePushNotificationsSupported) {
    return null;
  }
  if (notificationsModule === undefined) {
    // Static import would crash Expo Go on Android before the app finishes starting.
    notificationsModule = require('expo-notifications') as NotificationsModule;
  }
  return notificationsModule;
}
