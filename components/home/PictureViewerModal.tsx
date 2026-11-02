import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Image, Modal, Platform, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SeenPhotoTile } from '../profile/SeenPhotoTile';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PictureViewerModalProps {
  visible: boolean;
  pictures: string[];
  initialIndex: number;
  onClose: () => void;
  /** One-time photo this viewer already opened. Show it blurred with a Seen tile. */
  seen?: boolean;
}

const seenWebBlur: ViewStyle = { filter: "blur(28px)" } as ViewStyle;

export default function PictureViewerModal({
  visible,
  pictures,
  initialIndex,
  onClose,
  seen = false,
}: PictureViewerModalProps): React.JSX.Element {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  React.useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < pictures.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>

        <View style={styles.imageContainer}>
          <View
            style={[
              styles.photoFrame,
              seen && Platform.OS === "web" ? seenWebBlur : null,
            ]}
          >
            <Image
              source={{ uri: pictures[currentIndex] }}
              style={styles.image}
              resizeMode="contain"
              blurRadius={seen ? 28 : 0}
            />
          </View>
          {seen ? <SeenPhotoTile /> : null}
        </View>

        {pictures.length > 1 && (
          <View style={styles.navigation}>
            <TouchableOpacity
              style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
              onPress={handlePrevious}
              disabled={currentIndex === 0}
            >
              <Ionicons 
                name="chevron-back" 
                size={28} 
                color={currentIndex === 0 ? '#666' : '#fff'} 
              />
            </TouchableOpacity>

            <View style={styles.dotsContainer}>
              {pictures.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === currentIndex && styles.activeDot,
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.navButton,
                currentIndex === pictures.length - 1 && styles.navButtonDisabled,
              ]}
              onPress={handleNext}
              disabled={currentIndex === pictures.length - 1}
            >
              <Ionicons 
                name="chevron-forward" 
                size={28} 
                color={currentIndex === pictures.length - 1 ? '#666' : '#fff'} 
              />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    zIndex: 10000,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoFrame: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  navButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 24,
  },
});

