import { decode } from 'base64-arraybuffer';
import { readAsStringAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export interface BinaryFilePayload {
  arrayBuffer: ArrayBuffer;
  contentType: string;
  ext: string;
}

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
};

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
};

export function isLocalMediaUri(uri: string): boolean {
  return (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('ph://') ||
    uri.startsWith('assets-library://') ||
    uri.startsWith('blob:') ||
    uri.startsWith('data:')
  );
}

function extFromMime(mime: string): string {
  const normalized = mime.split(';')[0].trim().toLowerCase();
  if (MIME_TO_EXT[normalized]) {
    return MIME_TO_EXT[normalized];
  }
  if (normalized.includes('png')) return 'png';
  if (normalized.includes('pdf')) return 'pdf';
  if (normalized.includes('webp')) return 'webp';
  return 'jpg';
}

function mimeFromExt(ext: string): string {
  return EXT_TO_MIME[ext.toLowerCase()] || 'image/jpeg';
}

function extFromUri(uri: string): string {
  const clean = uri.split('?')[0].split('#')[0];
  const match = clean.match(/\.([a-zA-Z0-9]{2,5})$/);
  return match ? match[1].toLowerCase() : 'jpg';
}

export async function uriToBinary(uri: string): Promise<BinaryFilePayload> {
  if (uri.startsWith('data:')) {
    const commaIndex = uri.indexOf(',');
    const header = uri.substring(5, commaIndex);
    const data = uri.substring(commaIndex + 1);
    const mime = header.split(';')[0] || 'image/jpeg';
    const isBase64 = header.includes('base64');
    const base64 = isBase64 ? data : btoa(decodeURIComponent(data));
    return {
      arrayBuffer: decode(base64),
      contentType: mime,
      ext: extFromMime(mime),
    };
  }

  if (Platform.OS === 'web' || uri.startsWith('blob:')) {
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const contentType = blob.type || mimeFromExt(extFromUri(uri));
    return {
      arrayBuffer,
      contentType,
      ext: extFromMime(contentType),
    };
  }

  const base64 = await readAsStringAsync(uri, { encoding: 'base64' });
  const ext = extFromUri(uri);
  return {
    arrayBuffer: decode(base64),
    contentType: mimeFromExt(ext),
    ext,
  };
}
