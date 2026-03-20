import { useState } from 'react';
import { Alert, Share } from 'react-native';
import { Profile } from '../lib/profileService';

const APP_SCHEME = 'shiduchimapp';

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

    const deepLink = `${APP_SCHEME}://profile/${profile.id}`;
    const name = `${profile.first_name} ${profile.last_name}`;

    try {
      setIsSharing(true);
      await Share.share(
        {
          title: `${name} – Zivug Mishamayim`,
          // url is the tappable link on iOS (iMessage rich preview).
          // message must NOT repeat the link — iOS appends url to message automatically.
          message: `Check out ${name}'s profile on Zivug Mishamayim!\n\n📲 Don't have the app? Download it at: https://zivugmishamayim.com/`,
          url: deepLink,
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
