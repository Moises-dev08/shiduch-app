import { decode } from 'base64-arraybuffer';
import { readAsStringAsync } from 'expo-file-system/legacy';
// import { notificationService } from './notificationService';
import { supabase } from './supabase';

export interface ProfileData {
  firstName: string;
  lastName: string;
  age: string;
  hashkafa: string;
  role: 'single' | 'matchmaker';
  gender: 'male' | 'female';
  address: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  school: string;
  occupation: string;
  bio: string;
  phone: string;
  email: string;
  whatsapp: string;
  pictures: string[];
  picturePrivacy: 'none' | 'one-time' | 'always' | 'private';
  matchmakerEmail?: string; // Email of the matchmaker to associate
}

export interface PrivacySettings {
  phone: boolean;
  email: boolean;
  whatsapp: boolean;
  address: boolean;
  school: boolean;
  occupation: boolean;
}

export interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  age: number;
  hashkafa: string;
  role: string;
  gender: string;
  address: string;
  street: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  school: string;
  occupation: string;
  bio: string;
  phone: string;
  email: string;
  whatsapp: string;
  picture_privacy: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  pictures: string[];
  privacy_settings: PrivacySettings;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  matchmaker_id?: string; // ID of associated matchmaker
}

class ProfileService {
  /**
   * Check if URI is a local file that needs uploading
   */
  private isLocalFile(uri: string): boolean {
    return uri.startsWith('file://') || 
           uri.startsWith('content://') || 
           uri.startsWith('ph://') || // iOS Photo Library
           uri.startsWith('assets-library://') || // iOS Assets
           !uri.includes('/'); // Relative path
  }

  /**
   * Search for a matchmaker by email
   */
  async findMatchmakerByEmail(email: string): Promise<{ success: boolean; matchmaker?: Profile; error?: string }> {
    try {
      if (!email || !email.trim()) {
        return { success: false, error: 'Email is required' };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .eq('role', 'matchmaker')
        .eq('status', 'approved')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No matchmaker found
          return { success: false, error: 'Matchmaker not found. Please invite them to create a matchmaker account in the app.' };
        }
        return { success: false, error: error.message };
      }

      return { success: true, matchmaker: data };
    } catch (error) {
      console.error('Error finding matchmaker:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Upload a single image to Supabase Storage
   */
  async uploadImage(uri: string, userId: string, index: number): Promise<string | null> {
    try {
      console.log('Uploading image:', uri);

      // Read the file as base64
      const base64 = await readAsStringAsync(uri, {
        encoding: 'base64',
      });

      console.log('Base64 length:', base64.length);

      // Get file extension and determine content type
      let ext = 'jpg';
      let contentType = 'image/jpeg';
      
      if (uri.includes('.')) {
        const uriExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
        ext = uriExt;
        
        // Map extensions to proper MIME types
        const mimeMap: { [key: string]: string } = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'webp': 'image/webp',
          'heic': 'image/heic',
          'heif': 'image/heif'
        };
        
        contentType = mimeMap[ext] || 'image/jpeg';
      }

      const fileName = `${userId}/picture_${index}_${Date.now()}.${ext}`;
      console.log('Uploading as:', fileName, 'Type:', contentType);

      // Convert base64 to array buffer
      const arrayBuffer = decode(base64);
      console.log('ArrayBuffer size:', arrayBuffer.byteLength);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, arrayBuffer, {
          contentType: contentType,
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      console.log('Upload successful:', data);
      return fileName;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  }

  /**
   * Upload multiple images
   */
  async uploadImages(uris: string[], userId: string): Promise<string[]> {
    const uploadPromises = uris.map((uri, index) => 
      this.uploadImage(uri, userId, index)
    );
    
    const results = await Promise.all(uploadPromises);
    return results.filter((path): path is string => path !== null);
  }

  /**
   * Create a new profile
   */
  async createProfile(
    profileData: ProfileData,
    privacySettings: PrivacySettings
  ): Promise<{ success: boolean; error?: string; profile?: Profile }> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Upload images if any
      let picturePaths: string[] = [];
      if (profileData.pictures.length > 0) {
        console.log('Starting image upload for', profileData.pictures.length, 'images');
        console.log('Image URIs:', profileData.pictures);
        
        picturePaths = await this.uploadImages(profileData.pictures, user.id);
        
        console.log('Upload complete. Successful uploads:', picturePaths.length, 'out of', profileData.pictures.length);
        console.log('Uploaded paths:', picturePaths);
        
        if (picturePaths.length !== profileData.pictures.length) {
          console.warn(`Warning: ${profileData.pictures.length - picturePaths.length} images failed to upload`);
        }
        
        if (picturePaths.length === 0 && profileData.pictures.length > 0) {
          console.error('All images failed to upload!');
        }
      }

      // Find matchmaker if email provided (only for single users)
      let matchmakerId: string | null = null;
      if (profileData.role === 'single' && profileData.matchmakerEmail) {
        const matchmakerResult = await this.findMatchmakerByEmail(profileData.matchmakerEmail);
        if (matchmakerResult.success && matchmakerResult.matchmaker) {
          matchmakerId = matchmakerResult.matchmaker.id;
        } else {
          // Return error if matchmaker not found
          return { success: false, error: matchmakerResult.error };
        }
      }

      // Create profile in database
      const { data, error} = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          age: parseInt(profileData.age),
          hashkafa: profileData.hashkafa,
          role: profileData.role,
          gender: profileData.gender,
          address: profileData.address,
          street: profileData.street,
          city: profileData.city,
          state: profileData.state,
          zip_code: profileData.zipCode,
          country: profileData.country,
          school: profileData.school,
          occupation: profileData.occupation,
          bio: profileData.bio,
          phone: profileData.phone,
          email: profileData.email,
          whatsapp: profileData.whatsapp,
          picture_privacy: profileData.picturePrivacy,
          pictures: picturePaths,
          privacy_settings: privacySettings,
          status: 'pending',
          matchmaker_id: matchmakerId,
        })
        .select()
        .single();

      if (error) {
        console.error('Profile creation error:', error);
        return { success: false, error: error.message };
      }

      // Notify all admins about new profile submission
      // try {
      //   await notificationService.notifyAdmins(
      //     'New Profile Submitted',
      //     `${profileData.firstName} ${profileData.lastName} has submitted their profile for review.`,
      //     {
      //       type: 'new_profile',
      //       profileId: data.id,
      //       userName: `${profileData.firstName} ${profileData.lastName}`,
      //     }
      //   );
      // } catch (notifError) {
      //   console.error('Failed to notify admins:', notifError);
      //   // Don't fail profile creation if notification fails
      // }

      return { success: true, profile: data };
    } catch (error) {
      console.error('Unexpected error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get user's profile
   */
  async getProfile(): Promise<{ success: boolean; profile?: Profile; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found
          return { success: true, profile: undefined };
        }
        return { success: false, error: error.message };
      }

      return { success: true, profile: data };
    } catch (error) {
      console.error('Error fetching profile:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Update existing profile
   */
  async updateProfile(
    profileData: ProfileData,
    privacySettings: PrivacySettings
  ): Promise<{ success: boolean; error?: string; profile?: Profile }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Handle new images (local URIs that need uploading)
      let picturePaths: string[] = [];
      for (const picture of profileData.pictures) {
        if (this.isLocalFile(picture)) {
          // This is a local file, need to upload
          console.log('Uploading local file:', picture);
          const index = profileData.pictures.indexOf(picture);
          const uploadedPath = await this.uploadImage(picture, user.id, index);
          if (uploadedPath) {
            picturePaths.push(uploadedPath);
          } else {
            console.error('Failed to upload:', picture);
          }
        } else {
          // This is already a storage path
          console.log('Keeping existing storage path:', picture);
          picturePaths.push(picture);
        }
      }

      // Find matchmaker if email provided (only for single users)
      let matchmakerId: string | null = null;
      if (profileData.role === 'single' && profileData.matchmakerEmail) {
        const matchmakerResult = await this.findMatchmakerByEmail(profileData.matchmakerEmail);
        if (matchmakerResult.success && matchmakerResult.matchmaker) {
          matchmakerId = matchmakerResult.matchmaker.id;
        } else {
          // Return error if matchmaker not found
          return { success: false, error: matchmakerResult.error };
        }
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          age: parseInt(profileData.age),
          hashkafa: profileData.hashkafa,
          role: profileData.role,
          gender: profileData.gender,
          address: profileData.address,
          street: profileData.street,
          city: profileData.city,
          state: profileData.state,
          zip_code: profileData.zipCode,
          country: profileData.country,
          school: profileData.school,
          occupation: profileData.occupation,
          bio: profileData.bio,
          phone: profileData.phone,
          email: profileData.email,
          whatsapp: profileData.whatsapp,
          picture_privacy: profileData.picturePrivacy,
          pictures: picturePaths,
          privacy_settings: privacySettings,
          matchmaker_id: matchmakerId,
        })
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, profile: data };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get profile status
   */
  async getProfileStatus(): Promise<{ 
    success: boolean; 
    status?: 'pending' | 'approved' | 'rejected'; 
    rejectionReason?: string;
    error?: string;
  }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('status, rejection_reason')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found
          return { success: true, status: undefined };
        }
        return { success: false, error: error.message };
      }

      return { 
        success: true, 
        status: data.status,
        rejectionReason: data.rejection_reason 
      };
    } catch (error) {
      console.error('Error fetching profile status:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get image URL from storage path
   */
  getImageUrl(path: string): string {
    const { data } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(path);
    
    return data.publicUrl;
  }
}

export const profileService = new ProfileService();

