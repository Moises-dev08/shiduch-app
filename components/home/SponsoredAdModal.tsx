import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Image,
  Linking,
  Modal,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSponsorImageUrl, SponsoredAd } from '../../lib/sponsorService';
import { styles } from './SponsoredAdModal.styles';

interface SponsoredAdModalProps {
  visible: boolean;
  ad: SponsoredAd | null;
  onClose: () => void;
}

function getImageSize(windowWidth: number, windowHeight: number): {
  width: number;
  height: number;
} {
  const maxWidth = Math.min(windowWidth - 48, 560);
  const maxHeight = Math.min(windowHeight * 0.48, 320);
  const height = Math.min(maxWidth * (9 / 16), maxHeight);
  const width = height * (16 / 9);
  return { width, height };
}

export default function SponsoredAdModal({
  visible,
  ad,
  onClose,
}: SponsoredAdModalProps): React.ReactElement | null {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const imageSize = getImageSize(windowWidth, windowHeight);

  if (!ad) {
    return null;
  }

  const openSponsorSite = async (): Promise<void> => {
    try {
      await Linking.openURL(ad.cta_url);
    } catch (error) {
      console.error('Error opening sponsor link:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          accessibilityLabel="Close ad"
        >
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.sponsoredChip}>
            <Text style={styles.sponsoredChipText}>Ad</Text>
          </View>
          <Image
            source={{ uri: getSponsorImageUrl(ad.image_path) }}
            style={[styles.image, imageSize]}
            resizeMode="contain"
          />
          <Text style={styles.title}>{ad.title}</Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.ctaButton} onPress={openSponsorSite}>
            <Text style={styles.ctaButtonText}>{ad.cta_label}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
