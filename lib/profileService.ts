import { decode } from 'base64-arraybuffer';
import { readAsStringAsync } from 'expo-file-system/legacy';
// import { notificationService } from './notificationService';
import { supabase, supabaseAnonKey, supabaseUrl } from './supabase';

export interface ProfileData {
  // Basic required fields
  firstName: string;
  lastName: string;
  gender: 'male' | 'female';
  role: 'single' | 'matchmaker';
  dob: string; // Date of birth
  bio: string;
  phone: string;
  
  // Pictures
  pictures: string[];
  mainPictureIndex?: number;
  picturePrivacy: 'none' | 'always' | 'private' | 'one-time';
  
  // Singles only - required fields
  whatLookingFor?: string; // Required for singles
  
  // Optional fields with "Ask me" capability
  height?: string;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
  languages?: string[];
  
  // Nationality / Background
  nationality?: string[];
  isCohen?: boolean; // Male only
  
  // Hashkafa / Religious
  hashkafaType?: string; // Specific type
  torahLearning?: string; // Male only
  praying?: string; // Male only
  
  // Education
  educationLevel?: string;
  postHighSchoolPath?: string;
  
  // Occupation / Study
  currentOccupationStudy?: string;
  
  // Plan After Marriage
  planAfterMarriage?: string;
  
  // Marital Status
  maritalStatus?: string;
  
  // Dress & Appearance
  dressStyle?: string;
  wearsBlackHat?: boolean; // Male only
  headCovering?: string; // Female only
  
  // Lifestyle
  smoking?: string;
  alcoholConsumption?: string;
  
  // References
  userReferences?: { name: string; phone: string }[];
  
  // Contact info (optional - for legacy support and direct contact)
  email?: string;
  whatsapp?: string;
  hasChildren?: boolean;
  matchmakerEmail?: string;
}

export interface FieldPrivacy {
  [fieldName: string]: boolean; // true means field is private/"Ask me"
}

export interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  gender: string;
  role: string;
  dob?: string;
  bio: string;
  phone: string;
  picture_privacy: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  pictures: string[];
  
  // What looking for (required for singles)
  what_looking_for?: string;
  
  // Optional fields
  height?: string;
  location_city?: string;
  location_state?: string;
  location_country?: string;
  languages?: string[];
  
  // Nationality / Background
  nationality?: string[];
  is_cohen?: boolean;
  
  // Hashkafa / Religious
  hashkafa_type?: string;
  torah_learning?: string;
  praying?: string;
  
  // Education
  education_level?: string;
  post_high_school_path?: string;
  
  // Occupation / Study
  current_occupation_study?: string;
  
  // Plan After Marriage
  plan_after_marriage?: string;
  
  // Marital Status
  marital_status?: string;
  
  // Dress & Appearance
  dress_style?: string;
  wears_black_hat?: boolean;
  head_covering?: string;
  
  // Lifestyle
  smoking?: string;
  alcohol_consumption?: string;
  
  // References
  user_references?: { name: string; phone: string }[];
  
  // Privacy and metadata
  field_privacy?: FieldPrivacy; // Maps field names to private/"Ask me" flags
  last_active_at?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  matchmaker_id?: string;
  is_active: boolean;
  email?: string;
  whatsapp?: string;
  has_children?: boolean;
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
   * Extract storage path from public URL
   * Converts: https://xxx.supabase.co/storage/v1/object/public/profile-pictures/user-id/image-0.jpg
   * To: user-id/image-0.jpg
   */
  private extractStoragePath(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // Extract the path after '/profile-pictures/'
      const bucketPath = '/profile-pictures/';
      const index = url.indexOf(bucketPath);
      if (index !== -1) {
        return url.substring(index + bucketPath.length);
      }
    }
    // If not a URL, return as is (already a storage path)
    return url;
  }

  /**
   * Search for a matchmaker ONLY by their authentication email (signup email)
   */
  async findMatchmakerByEmail(searchTerm: string): Promise<{ success: boolean; matchmaker?: Profile; error?: string }> {
    try {
      if (!searchTerm || !searchTerm.trim()) {
        return { success: false, error: 'Email is required' };
      }

      const trimmedSearch = searchTerm.trim().toLowerCase();
      console.log('Searching for matchmaker by auth email:', trimmedSearch);

      // Search by auth email ONLY (the email they used to sign up)
      const { data: authUsers, error: authError } = await supabase.rpc('get_matchmaker_by_auth_email', {
        search_email: trimmedSearch
      });

      if (authError) {
        console.error('Error calling RPC function:', authError);
        return { success: false, error: 'Failed to search for matchmaker' };
      }

      if (!authUsers || authUsers.length === 0) {
        console.log('No matchmaker found with auth email:', trimmedSearch);
        return { 
          success: false, 
          error: 'Matchmaker not found. Please use the email they signed up with and ensure they have an approved matchmaker account.' 
        };
      }

      const matchmakerId = authUsers[0].profile_id;
      console.log('Found matchmaker profile ID:', matchmakerId);

      const { data: matchmaker, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', matchmakerId)
        .single();
      
      if (profileError || !matchmaker) {
        console.error('Error fetching matchmaker profile:', profileError);
        return { success: false, error: 'Failed to load matchmaker profile' };
      }

      console.log('Found matchmaker by auth email:', matchmaker.first_name, matchmaker.last_name);
      return { success: true, matchmaker };
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
    fieldPrivacy?: FieldPrivacy
  ): Promise<{ success: boolean; error?: string; profile?: Profile; wasResubmitted?: boolean }> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Upload images if any
      let picturePaths: string[] = [];
      if (profileData.pictures.length > 0) {

        picturePaths = await this.uploadImages(profileData.pictures, user.id);
      
        
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
          gender: profileData.gender,
          role: profileData.role,
          dob: profileData.dob || null,
          bio: profileData.bio,
          phone: profileData.phone,
          picture_privacy: profileData.picturePrivacy,
          pictures: picturePaths,
          
          // Singles required field
          what_looking_for: profileData.whatLookingFor || null,
          
          // Optional comprehensive fields
          height: profileData.height || null,
          location_city: profileData.locationCity || null,
          location_state: profileData.locationState || null,
          location_country: profileData.locationCountry || null,
          languages: profileData.languages || null,
          
          // Nationality / Background
          nationality: profileData.nationality || null,
          is_cohen: profileData.isCohen || null,
          
          // Hashkafa / Religious
          hashkafa_type: profileData.hashkafaType || null,
          torah_learning: profileData.torahLearning || null,
          praying: profileData.praying || null,
          
          // Education
          education_level: profileData.educationLevel || null,
          post_high_school_path: profileData.postHighSchoolPath || null,
          
          // Occupation / Study
          current_occupation_study: profileData.currentOccupationStudy || null,
          
          // Plan After Marriage
          plan_after_marriage: profileData.planAfterMarriage || null,
          
          // Marital Status
          marital_status: profileData.maritalStatus || null,
          
          // Dress & Appearance
          dress_style: profileData.dressStyle || null,
          wears_black_hat: profileData.wearsBlackHat || null,
          head_covering: profileData.headCovering || null,
          
          // Lifestyle
          smoking: profileData.smoking || null,
          alcohol_consumption: profileData.alcoholConsumption || null,
          
          // References
          user_references: profileData.userReferences || [],
          
          // Contact info (optional)
          email: profileData.email || null,
          whatsapp: profileData.whatsapp || null,
          
          // Children
          has_children: profileData.hasChildren || null,
          
          // Privacy settings
          field_privacy: fieldPrivacy || {},
          
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
    fieldPrivacy?: FieldPrivacy
  ): Promise<{ success: boolean; error?: string; profile?: Profile; wasResubmitted?: boolean }> {
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
          // This might be a public URL or already a storage path
          // Convert public URL to storage path if needed
          const storagePath = this.extractStoragePath(picture);
          picturePaths.push(storagePath);
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

      // Check current profile status
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('status')
        .eq('user_id', user.id)
        .single();

      // If profile was rejected, reset to pending for re-review
      const shouldResetStatus = currentProfile?.status === 'rejected';

      const updateData: any = {
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        gender: profileData.gender,
        role: profileData.role,
        dob: profileData.dob || null,
        bio: profileData.bio,
        phone: profileData.phone,
        picture_privacy: profileData.picturePrivacy,
        pictures: picturePaths,
        
        // Singles required field
        what_looking_for: profileData.whatLookingFor || null,
        
        // Optional comprehensive fields
        height: profileData.height || null,
        location_city: profileData.locationCity || null,
        location_state: profileData.locationState || null,
        location_country: profileData.locationCountry || null,
        languages: profileData.languages || null,
        
        // Nationality / Background
        nationality: profileData.nationality || null,
        is_cohen: profileData.isCohen || null,
        
        // Hashkafa / Religious
        hashkafa_type: profileData.hashkafaType || null,
        torah_learning: profileData.torahLearning || null,
        praying: profileData.praying || null,
        
        // Education
        education_level: profileData.educationLevel || null,
        post_high_school_path: profileData.postHighSchoolPath || null,
        
        // Occupation / Study
        current_occupation_study: profileData.currentOccupationStudy || null,
        
        // Plan After Marriage
        plan_after_marriage: profileData.planAfterMarriage || null,
        
        // Marital Status
        marital_status: profileData.maritalStatus || null,
        
        // Dress & Appearance
        dress_style: profileData.dressStyle || null,
        wears_black_hat: profileData.wearsBlackHat || null,
        head_covering: profileData.headCovering || null,
        
        // Lifestyle
        smoking: profileData.smoking || null,
        alcohol_consumption: profileData.alcoholConsumption || null,
        
        // References
        user_references: profileData.userReferences || [],
        
        // Contact info (optional)
        email: profileData.email || null,
        whatsapp: profileData.whatsapp || null,
        
        // Children
        has_children: profileData.hasChildren || null,
        
        // Privacy settings
        field_privacy: fieldPrivacy || {},
        
        matchmaker_id: matchmakerId,
      };

      // Reset status to pending if it was rejected
      if (shouldResetStatus) {
        updateData.status = 'pending';
        updateData.rejection_reason = null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Add a flag if profile was resubmitted
      if (shouldResetStatus) {
        console.log('Profile was rejected and has been resubmitted for review');
      }

      return { success: true, profile: data, wasResubmitted: shouldResetStatus };
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

  /**
   * Freeze user profile (make it invisible to others)
   */
  async freezeProfile(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error freezing profile:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Unfreeze user profile (make it visible to others)
   */
  async unfreezeProfile(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('profiles')
        .update({ is_active: true })
        .eq('user_id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error unfreezing profile:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Delete user account permanently
   */
  async deleteAccount(): Promise<{ success: boolean; error?: string }> {
    try {
      // Refresh session to get a fresh token
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError || !session) {
        console.error('Session error:', sessionError);
        return { success: false, error: 'Not authenticated. Please log in again.' };
      }

      console.log('Calling delete-account function with token');

      // Call the delete-account edge function
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Error deleting account:', result);
        return { success: false, error: result.error || 'Failed to delete account' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteAccount:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}

export const profileService = new ProfileService();

