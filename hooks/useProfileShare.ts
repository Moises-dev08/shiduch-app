import { useState } from 'react';
import { Alert } from 'react-native';
import { generateAndShareProfilePDF, ProfilePDFData, profileToPDFData } from '../lib/pdfService';
import { Profile } from '../lib/profileService';

export interface UseProfileShareResult {
  isSharing: boolean;
  shareProfile: (profile: Profile, profileData?: Partial<ProfilePDFData>) => Promise<void>;
}

/**
 * Custom hook for sharing profile as PDF
 */
export function useProfileShare(): UseProfileShareResult {
  const [isSharing, setIsSharing] = useState(false);

  const shareProfile = async (
    profile: Profile,
    additionalData?: Partial<ProfilePDFData>
  ): Promise<void> => {
    try {
      // Convert profile to PDF data
      const pdfData = profileToPDFData(profile);

      // Merge with any additional data
      const finalData = {
        ...pdfData,
        ...additionalData,
      };

      // Validate required fields
      if (!finalData.firstName || !finalData.lastName) {
        Alert.alert('Error', 'Profile must have a first and last name to share.');
        return;
      }

      // Show confirmation dialog
      Alert.alert(
        'Share Profile',
        `Share ${finalData.firstName} ${finalData.lastName}'s profile as PDF?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Share',
            onPress: async () => {
              setIsSharing(true);
              try {
                const result = await generateAndShareProfilePDF(finalData);

                if (!result.success) {
                  Alert.alert('Error', result.error || 'Failed to share profile');
                }
              } catch (error) {
                console.error('Error sharing profile:', error);
                Alert.alert('Error', 'An unexpected error occurred while sharing');
              } finally {
                setIsSharing(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error preparing profile share:', error);
      Alert.alert('Error', 'Failed to prepare profile for sharing');
    }
  };

  return {
    isSharing,
    shareProfile,
  };
}

