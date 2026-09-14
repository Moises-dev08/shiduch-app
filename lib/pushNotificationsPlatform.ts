import { Platform } from 'react-native';

/** expo-notifications APIs are native-only; they throw on web. */
export const isNativePushNotificationsSupported = Platform.OS !== 'web';
