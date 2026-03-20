import { useState } from 'react';
import { Alert, Platform, Share } from 'react-native';
import { Profile } from '../lib/profileService';
import { getProfileHttpsShareUrl, PROFILE_SHARE_WEB_BASE } from '../lib/profileShareUrls';

export interface UseProfileShareResult {
  isSharing: boolean;
  shareProfile: (profile: Profile) => Promise<void>;
}

export function useProfileShare(): UseProfileShareResult {
  const [isSharing, setIsSharing] = useState(false);

  const shareProfile = async (profile: Profile): Promise<void> => {
    if (!profile.id) {
      Alert.alert('Error', 'Profile must be saved before it can be shared.');
      return;
    }

    if (!profile.first_name || !profile.last_name) {
      Alert.alert('Error', 'Profile must have a first and last name to share.');
      return;
    }

    const webUrl = getProfileHttpsShareUrl(profile.id);
    const name = `${profile.first_name} ${profile.last_name}`;
    const footer = `Don't have the app? Visit ${PROFILE_SHARE_WEB_BASE}/`;

    try {
      setIsSharing(true);
      // iOS: only https:// is reliably tappable in Messages — custom schemes are plain text.
      await Share.share(
        Platform.OS === 'ios'
          ? {
              title: `${name} – Zivug Mishamayim`,
              message: `Check out ${name}'s profile on Zivug Mishamayim!\n\n📲 ${footer}`,
              url: webUrl,
            }
          : {
              title: `${name} – Zivug Mishamayim`,
              message: `Check out ${name}'s profile on Zivug Mishamayim!\n\n${webUrl}\n\n📲 ${footer}`,
            },
        { dialogTitle: `Share ${name}'s Profile` }
      );
    } catch (error: any) {
      // User cancelled share — no need to show an error
      if (error?.message !== 'User did not share') {
        console.error('Error sharing profile:', error);
        Alert.alert('Error', 'An unexpected error occurred while sharing.');
      }
    } finally {
      setIsSharing(false);
    }
  };

  return { isSharing, shareProfile };
}
