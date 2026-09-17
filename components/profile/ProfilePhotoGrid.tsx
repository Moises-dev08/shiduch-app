import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { pickProfileImage } from '../../lib/pickProfileImage';
import ConfirmationModal from '../ConfirmationModal';
import PictureViewerModal from '../home/PictureViewerModal';
import InfoModal from '../InfoModal';
import { styles } from './ProfilePhotoGrid.styles';

interface ProfilePhotoGridProps {
  pictures: string[];
  onChange: (pictures: string[]) => void;
  maxPhotos?: number;
  firstPhotoBadge?: string;
}

export default function ProfilePhotoGrid({
  pictures,
  onChange,
  maxPhotos = 3,
  firstPhotoBadge = 'Main',
}: ProfilePhotoGridProps): React.ReactElement {
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const [infoTitle, setInfoTitle] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const handlePick = async (): Promise<void> => {
    if (pictures.length >= maxPhotos) {
      setInfoTitle('Limit reached');
      setInfoMessage(`You can only upload up to ${maxPhotos} pictures`);
      setInfoVisible(true);
      return;
    }

    const uri = await pickProfileImage();
    if (uri) {
      onChange([...pictures, uri]);
    }
  };

  const confirmDelete = (): void => {
    if (deleteIndex === null) return;
    onChange(pictures.filter((_, index) => index !== deleteIndex));
    setDeleteIndex(null);
  };

  const guideText =
    pictures.length === 0
      ? `Add up to ${maxPhotos} photos. The first will be your main photo.`
      : pictures.length < maxPhotos
        ? `You can add ${maxPhotos - pictures.length} more photo${maxPhotos - pictures.length > 1 ? 's' : ''}.`
        : 'Maximum photos added.';

  return (
    <>
      <Text style={styles.pictureGuide}>{guideText}</Text>
      <View style={styles.picturesContainer}>
        {pictures.map((picture, index) => (
          <View key={`${picture}-${index}`} style={styles.pictureWrapper}>
            <TouchableOpacity
              onPress={() => setViewerIndex(index)}
              activeOpacity={0.85}
              accessibilityLabel="View photo full screen"
            >
              <Image source={{ uri: picture }} style={styles.picture} />
            </TouchableOpacity>
            {index === 0 && (
              <View style={styles.mainBadge} pointerEvents="none">
                <Text style={styles.mainBadgeText}>{firstPhotoBadge}</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.removePicture}
              onPress={() => setDeleteIndex(index)}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              accessibilityLabel="Delete photo"
            >
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
        {pictures.length < maxPhotos && (
          <TouchableOpacity style={styles.addPicture} onPress={handlePick}>
            <Ionicons name="camera" size={24} color="#666" />
            <Text style={styles.addPictureText}>Add photo</Text>
          </TouchableOpacity>
        )}
      </View>

      <PictureViewerModal
        visible={viewerIndex !== null}
        pictures={pictures}
        initialIndex={viewerIndex ?? 0}
        onClose={() => setViewerIndex(null)}
      />

      <ConfirmationModal
        visible={deleteIndex !== null}
        title="Delete photo"
        message="Are you sure you want to delete this photo?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteIndex(null)}
        iconName="trash"
        iconColor="#F44336"
      />

      <InfoModal
        visible={infoVisible}
        title={infoTitle}
        message={infoMessage}
        iconName="alert-circle"
        iconColor="#FF9800"
        onClose={() => setInfoVisible(false)}
      />
    </>
  );
}
