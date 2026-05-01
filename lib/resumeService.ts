import { decode } from 'base64-arraybuffer';
import { readAsStringAsync, getInfoAsync } from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

const MAX_BYTES = 8 * 1024 * 1024;

function extensionFromMime(mime?: string | null): string {
  if (!mime) return 'jpg';
  if (mime.includes('png')) return 'png';
  if (mime.includes('heif') || mime.includes('heic')) return 'heic';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  return 'jpg';
}

function deriveResumeFileName(asset: ImagePicker.ImagePickerAsset): string {
  const rawName = asset.fileName?.trim();
  if (rawName && /\.[a-zA-Z0-9]{2,8}$/.test(rawName)) {
    return rawName;
  }
  const ext = extensionFromMime(asset.mimeType ?? null);
  return `resume.${ext}`;
}

class ResumeService {
  private readonly BUCKET_NAME = 'resumes';
  
  /**
   * Pick a resume image from the device photo library (gallery).
   */
  async pickDocument(): Promise<{ success: boolean; uri?: string; name?: string; type?: string; error?: string }> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        return {
          success: false,
          error: 'Photo library access is needed to attach a resume image.',
        };
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.92,
      });

      if (result.canceled) {
        return { success: false, error: 'Selection cancelled' };
      }

      const asset = result.assets[0];
      if (!asset?.uri) {
        return { success: false, error: 'Could not read the selected photo' };
      }

      let sizeBytes = asset.fileSize;
      if (sizeBytes == null) {
        try {
          const info = await getInfoAsync(asset.uri, { size: true });
          if (info.exists && typeof info.size === 'number') {
            sizeBytes = info.size;
          }
        } catch {
          /* size unknown — allow upload attempt */
        }
      }

      if (sizeBytes != null && sizeBytes > MAX_BYTES) {
        return { success: false, error: 'Image must be less than 8MB' };
      }

      const name = deriveResumeFileName(asset);

      return {
        success: true,
        uri: asset.uri,
        name,
        type: asset.mimeType ?? undefined,
      };
    } catch (error: any) {
      console.error('Error picking resume from gallery:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upload resume to Supabase storage
   */
  async uploadResume(fileUri: string, fileName: string): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Read file as base64
      const base64 = await readAsStringAsync(fileUri, {
        encoding: 'base64',
      });

      // Generate unique file path
      const fileExt = fileName.split('.').pop();
      const filePath = `${user.id}/resume.${fileExt}`;

      // Delete existing resume if any
      await this.deleteResume();

      // Upload to storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, decode(base64), {
          contentType: fileName.toLowerCase().endsWith('.pdf')
            ? 'application/pdf'
            : 'image/*',
          upsert: true,
        });

      if (error) {
        console.error('Error uploading resume:', error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      // Update profile with resume URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ resume_url: urlData.publicUrl })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating profile with resume URL:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true, url: urlData.publicUrl };
    } catch (error: any) {
      console.error('Error in uploadResume:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete resume from storage and profile
   */
  async deleteResume(): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // List files in user's folder
      const { data: files, error: listError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(user.id);

      if (listError) {
        console.error('Error listing files:', listError);
        // Continue even if listing fails, maybe file doesn't exist
      }

      // Delete all files in user's folder
      if (files && files.length > 0) {
        const filePaths = files.map(file => `${user.id}/${file.name}`);
        const { error: deleteError } = await supabase.storage
          .from(this.BUCKET_NAME)
          .remove(filePaths);

        if (deleteError) {
          console.error('Error deleting files:', deleteError);
        }
      }

      // Update profile to remove resume URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ resume_url: null })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in deleteResume:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get resume URL for a profile
   */
  getResumeUrl(resumeUrl: string): string {
    return resumeUrl;
  }

  /**
   * Open resume in an in-app browser preview sheet.
   * Works for both PDFs and images without leaving the app.
   */
  async downloadResume(resumeUrl: string, _fileName: string = 'resume'): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await WebBrowser.openBrowserAsync(resumeUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        controlsColor: '#1293DA',
      });
      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { success: true }; // user closed the preview — not an error
      }
      return { success: true };
    } catch (error: any) {
      console.error('Error opening resume preview:', error);
      return { success: false, error: error.message };
    }
  }
}

export const resumeService = new ResumeService();

