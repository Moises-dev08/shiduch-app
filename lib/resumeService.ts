import { decode } from 'base64-arraybuffer';
import { getDocumentAsync } from 'expo-document-picker';
import { readAsStringAsync } from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

class ResumeService {
  private readonly BUCKET_NAME = 'resumes';
  
  /**
   * Pick a document (PDF or image) for resume upload
   */
  async pickDocument(): Promise<{ success: boolean; uri?: string; name?: string; type?: string; error?: string }> {
    try {
     
      const result = await getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return { success: false, error: 'Selection cancelled' };
      }

      const file = result.assets[0];
      
      // Check file size (max 5MB)
      if (file.size && file.size > 5 * 1024 * 1024) {
        return { success: false, error: 'File size must be less than 5MB' };
      }

      return {
        success: true,
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      };
    } catch (error: any) {
      console.error('Error picking document:', error);
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
          contentType: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/*',
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
   * Download resume (opens in browser/external app)
   */
  async downloadResume(resumeUrl: string, fileName: string = 'resume'): Promise<{ success: boolean; error?: string }> {
    try {

      await Linking.openURL(resumeUrl);
      return { success: true };
    } catch (error: any) {
      console.error('Error downloading resume:', error);
      return { success: false, error: error.message };
    }
  }
}

export const resumeService = new ResumeService();

