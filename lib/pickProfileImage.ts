import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

const MAX_EDGE = 1600;

function cleanBase64(value: string): string {
  return value.replace(/\s/g, '');
}

function mimeType(value: string | null | undefined): string {
  const mime = (value || 'image/jpeg').split(';')[0].trim().toLowerCase();
  if (mime === 'image/jpg') return 'image/jpeg';
  return mime || 'image/jpeg';
}

function dataUrl(mime: string, base64: string): string {
  return `data:${mimeType(mime)};base64,${cleanBase64(base64)}`;
}

async function blobToJpegDataUrl(blob: Blob): Promise<string> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    throw new Error('This photo format is not supported. Choose a JPEG or PNG.');
  }

  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('This photo could not be prepared.');
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', 0.85);
}

async function uriToJpegDataUrl(uri: string): Promise<string> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error('This photo could not be read.');
  }
  return blobToJpegDataUrl(await response.blob());
}

/**
 * Returns a JPEG or PNG data URL the preview and uploader can both use.
 * iPhone photos are requested as a compatible JPEG so they are not left as HEIC.
 */
export async function pickProfileImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: Platform.OS !== 'web',
    aspect: [1, 1],
    quality: 0.8,
    base64: true,
    exif: false,
    preferredAssetRepresentationMode:
      ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const asset = result.assets[0];
  const mime = mimeType(asset.mimeType);

  if (Platform.OS === 'web') {
    try {
      if (asset.uri) {
        return await uriToJpegDataUrl(asset.uri);
      }
    } catch {
      if (asset.base64 && (mime === 'image/jpeg' || mime === 'image/png' || mime === 'image/webp')) {
        return dataUrl(mime, asset.base64);
      }
      throw new Error('This photo format is not supported. Choose a JPEG or PNG.');
    }
  }

  if (asset.base64) {
    const usable = mime === 'image/png' || mime === 'image/webp' ? mime : 'image/jpeg';
    return dataUrl(usable, asset.base64);
  }

  if (asset.uri) {
    return asset.uri;
  }

  return null;
}
