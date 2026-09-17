import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export async function pickProfileImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: Platform.OS !== 'web',
    aspect: [1, 1],
    quality: 0.8,
    base64: Platform.OS === 'web',
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  if (Platform.OS === 'web' && asset.base64) {
    const mime = asset.mimeType || 'image/jpeg';
    return `data:${mime};base64,${asset.base64}`;
  }

  return asset.uri;
}
