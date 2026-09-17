import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { isLocalMediaUri, uriToBinary } from './uriToBinary';

export interface SponsoredAd {
  id: string;
  title: string;
  cta_label: string;
  cta_url: string;
  image_path: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
}

export interface SponsoredAdInput {
  title: string;
  ctaLabel: string;
  ctaUrl: string;
  durationDays: number;
  imageUri: string;
}

const BUCKET = 'sponsored-ads';

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function getSponsorImageUrl(path: string): string {
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export function isAdActive(ad: SponsoredAd, now: Date = new Date()): boolean {
  const start = new Date(ad.starts_at);
  const end = new Date(ad.ends_at);
  return start <= now && end > now;
}

export function remainingDurationDays(ad: SponsoredAd, now: Date = new Date()): number {
  const ms = new Date(ad.ends_at).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export async function pickSponsorImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: Platform.OS !== 'web',
    aspect: [16, 9],
    quality: 0.85,
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

async function uploadSponsorImage(uri: string): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { arrayBuffer, contentType, ext } = await uriToBinary(uri);
  const fileName = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(fileName, arrayBuffer, {
    contentType,
    upsert: false,
  });

  if (error) {
    console.error('Error uploading sponsor image:', error);
    return null;
  }

  return fileName;
}

class SponsorService {
  async getActiveAds(): Promise<{ success: boolean; ads?: SponsoredAd[]; error?: string }> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('sponsored_ads')
        .select('*')
        .lte('starts_at', now)
        .gt('ends_at', now)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, ads: (data ?? []) as SponsoredAd[] };
    } catch (error) {
      console.error('Error loading active ads:', error);
      return { success: false, error: 'Failed to load sponsored ads' };
    }
  }

  async getAllAds(): Promise<{ success: boolean; ads?: SponsoredAd[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('sponsored_ads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, ads: (data ?? []) as SponsoredAd[] };
    } catch (error) {
      console.error('Error loading ads:', error);
      return { success: false, error: 'Failed to load sponsored ads' };
    }
  }

  async createAd(
    input: SponsoredAdInput
  ): Promise<{ success: boolean; ad?: SponsoredAd; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      if (!input.title.trim() || !input.ctaLabel.trim() || !input.ctaUrl.trim()) {
        return { success: false, error: 'Title, CTA label, and link are required' };
      }
      if (input.durationDays < 1) {
        return { success: false, error: 'Duration must be at least 1 day' };
      }
      if (!input.imageUri) {
        return { success: false, error: 'Please add a picture' };
      }

      const imagePath = await uploadSponsorImage(input.imageUri);
      if (!imagePath) {
        return { success: false, error: 'Failed to upload picture' };
      }

      const startsAt = new Date();
      const endsAt = new Date(startsAt);
      endsAt.setDate(endsAt.getDate() + input.durationDays);

      const { data, error } = await supabase
        .from('sponsored_ads')
        .insert({
          title: input.title.trim(),
          cta_label: input.ctaLabel.trim(),
          cta_url: normalizeUrl(input.ctaUrl),
          image_path: imagePath,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, ad: data as SponsoredAd };
    } catch (error) {
      console.error('Error creating ad:', error);
      return { success: false, error: 'Failed to create sponsored ad' };
    }
  }

  async updateAd(
    id: string,
    input: Partial<SponsoredAdInput> & { imageUri?: string }
  ): Promise<{ success: boolean; ad?: SponsoredAd; error?: string }> {
    try {
      const updateData: Record<string, string> = {
        updated_at: new Date().toISOString(),
      };

      if (input.title !== undefined) {
        if (!input.title.trim()) {
          return { success: false, error: 'Title is required' };
        }
        updateData.title = input.title.trim();
      }
      if (input.ctaLabel !== undefined) {
        if (!input.ctaLabel.trim()) {
          return { success: false, error: 'CTA title is required' };
        }
        updateData.cta_label = input.ctaLabel.trim();
      }
      if (input.ctaUrl !== undefined) {
        if (!input.ctaUrl.trim()) {
          return { success: false, error: 'CTA link is required' };
        }
        updateData.cta_url = normalizeUrl(input.ctaUrl);
      }
      if (input.durationDays !== undefined) {
        if (input.durationDays < 1) {
          return { success: false, error: 'Duration must be at least 1 day' };
        }
        const endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + input.durationDays);
        updateData.ends_at = endsAt.toISOString();
        updateData.starts_at = new Date().toISOString();
      }
      if (input.imageUri && isLocalMediaUri(input.imageUri)) {
        const imagePath = await uploadSponsorImage(input.imageUri);
        if (!imagePath) {
          return { success: false, error: 'Failed to upload picture' };
        }
        updateData.image_path = imagePath;
      }

      const { data, error } = await supabase
        .from('sponsored_ads')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, ad: data as SponsoredAd };
    } catch (error) {
      console.error('Error updating ad:', error);
      return { success: false, error: 'Failed to update sponsored ad' };
    }
  }

  async deleteAd(id: string, imagePath?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (imagePath && !imagePath.startsWith('http')) {
        await supabase.storage.from(BUCKET).remove([imagePath]);
      }

      const { error } = await supabase.from('sponsored_ads').delete().eq('id', id);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting ad:', error);
      return { success: false, error: 'Failed to delete sponsored ad' };
    }
  }
}

export const sponsorService = new SponsorService();
