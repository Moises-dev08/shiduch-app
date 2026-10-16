import { notificationService } from './notificationService';
import { supabase, supabaseAnonKey, supabaseUrl } from './supabase';
import { isLocalMediaUri, uriToBinary } from './uriToBinary';

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
  picturePrivacy: 'none' | 'always' | 'private' | 'one_time';
  
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
  religiousLevel?: string; // For matchmakers
  culturalOrigin?: string; // For matchmakers
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
  
  // Contact info (optional - for legacy support and direct contact)
  email?: string;
  whatsapp?: string;
  
  // Resume document
  resumeUrl?: string;
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
  religious_level?: string;
  cultural_origin?: string;
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
  
  // Privacy and metadata
  field_privacy?: FieldPrivacy; // Maps field names to private/"Ask me" flags
  last_active_at?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  matchmaker_id?: string;
  is_active: boolean;
  notify_match_email?: boolean;
  resume_url?: string;
  email?: string;
  whatsapp?: string;
  has_children?: boolean;

  // Admin fields
  account_status?: 'active' | 'frozen' | 'suspended' | 'removed';
  suspension_reason?: string;
  suspended_until?: string;
  
  // Admin metadata (added by edge functions)
  is_update?: boolean; // True if this is a profile update (previously approved)
  last_approved_at?: string; // When the profile was last approved (before this update)
  pending_changes?: {
    summary: string;
    changes: {field: string, oldValue: any, newValue: any, displayName: string}[];
    updated_at: string;
  };
  last_viewed_singles_at?: string;
  last_viewed_intro_requests_at?: string;
  last_viewed_matches_at?: string;
  last_viewed_suggestions_at?: string;
  previous_role_data?: {
    role: 'single' | 'matchmaker';
    saved_at: string;
    fields: Record<string, any>;
  } | null;
}

class ProfileService {
  /**
   * Check if URI is a local file that needs uploading
   */
  private isLocalFile(uri: string): boolean {
    return isLocalMediaUri(uri);
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

      const { arrayBuffer, contentType, ext } = await uriToBinary(uri);
      const fileName = `${userId}/picture_${index}_${Date.now()}.${ext}`;
      console.log('Uploading as:', fileName, 'Type:', contentType, 'Size:', arrayBuffer.byteLength);

      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, arrayBuffer, {
          contentType,
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
          return { success: false, error: 'Failed to upload photos. Please try again.' };
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
          religious_level: profileData.religiousLevel || null,
          cultural_origin: profileData.culturalOrigin || null,
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
          
          // Contact info (optional)
          email: profileData.email || null,
          whatsapp: profileData.whatsapp || null,
          
          // Children
          has_children: profileData.hasChildren || null,
          
          // Resume (only for singles)
          resume_url: profileData.role === 'single' ? (profileData.resumeUrl || null) : null,
          
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

      // Notify matchmaker if they were selected
      if (matchmakerId) {
        try {
          const { data: matchmakerProfile } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .eq('id', matchmakerId)
            .single();

          if (matchmakerProfile) {
            await notificationService.sendNotification(
              matchmakerProfile.user_id,
              'You\'ve been selected as a Matchmaker',
              `${profileData.firstName} ${profileData.lastName} selected you as their matchmaker`,
              {
                type: 'matchmaker_selected',
                purpose: 'facilitator_chosen',
                profileId: data.id,
                singleUserId: user.id,
              }
            );
          }
        } catch (notifError) {
          console.error('Error sending matchmaker notification:', notifError);
          // Don't fail profile creation if notification fails
        }
      }

      // Notify all admins about new profile pending review
      try {
        const displayName = `${profileData.firstName} ${profileData.lastName}`;
        await notificationService.notifyAdmins(
          'New profile pending review',
          `${displayName} submitted a profile for approval.`,
          {
            type: 'admin_new_profile',
            profileId: data.id,
            userName: displayName,
          },
          { excludeUserIds: [user.id] }
        );
      } catch (notifError) {
        console.error('Failed to notify admins:', notifError);
      }

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
          console.log('Uploading local file:', picture);
          const index = profileData.pictures.indexOf(picture);
          const uploadedPath = await this.uploadImage(picture, user.id, index);
          if (uploadedPath) {
            picturePaths.push(uploadedPath);
          } else {
            console.error('Failed to upload:', picture);
            return { success: false, error: 'Failed to upload one or more photos. Please try again.' };
          }
        } else {
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

      // Get current profile to compare changes
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('*, matchmaker_id')
        .eq('user_id', user.id)
        .single();

      // Always set status to pending when profile is updated (for admin review)
      // This ensures any changes require admin approval before user can use the app
      const shouldResetStatus = currentProfile?.status === 'rejected' || currentProfile?.status === 'approved';
      
      // Preserve approved_at if it exists (to identify this as an update, not a new profile)
      // We only clear it if the profile was never approved (new profile)
      const preserveApprovedAt = currentProfile?.approved_at || null;

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
        religious_level: profileData.religiousLevel || null,
        cultural_origin: profileData.culturalOrigin || null,
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
        
        // Contact info (optional)
        email: profileData.email || null,
        whatsapp: profileData.whatsapp || null,
        
        // Children
        has_children: profileData.hasChildren || null,
        
        // Resume (only for singles)
        resume_url: profileData.role === 'single' ? (profileData.resumeUrl || null) : null,
        
        // Privacy settings
        field_privacy: fieldPrivacy || {},
        
        matchmaker_id: matchmakerId,
      };

      // Always reset status to pending when profile is updated (requires admin approval)
      // Clear rejection reason if it exists
      updateData.status = 'pending';
      updateData.rejection_reason = null;
      
      // Preserve approved_at if it exists (so we can identify this as an update)
      // This allows the admin dashboard to distinguish between new profiles and updates
      if (preserveApprovedAt) {
        updateData.approved_at = preserveApprovedAt;
      }

      // Detect and track changes for admin review
      if (currentProfile) {
        const changes = this.detectChanges(currentProfile, updateData, picturePaths);
        if (changes.length > 0) {
          updateData.pending_changes = {
            summary: this.formatChangeSummary(changes),
            changes: changes,
            updated_at: new Date().toISOString()
          };
        }
      }

      // Check if matchmaker changed to notify the new matchmaker
      const oldMatchmakerId = currentProfile?.matchmaker_id || null;
      const newMatchmakerId = matchmakerId;

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // Notify matchmaker if they were newly selected (different from before)
      if (newMatchmakerId && newMatchmakerId !== oldMatchmakerId) {
        try {
          const { data: matchmakerProfile } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .eq('id', newMatchmakerId)
            .single();

          const { data: singleProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', user.id)
            .single();

          if (matchmakerProfile && singleProfile) {
            await notificationService.sendNotification(
              matchmakerProfile.user_id,
              'You\'ve been selected as a Matchmaker',
              `${singleProfile.first_name} ${singleProfile.last_name} selected you as their matchmaker`,
              {
                type: 'matchmaker_selected',
                purpose: 'facilitator_chosen',
                profileId: data.id,
                singleUserId: user.id,
              }
            );
          }
        } catch (notifError) {
          console.error('Error sending matchmaker notification:', notifError);
          // Don't fail profile update if notification fails
        }
      }

      if (shouldResetStatus) {
        console.log('Profile resubmitted for admin review');
        try {
          const displayName = `${profileData.firstName} ${profileData.lastName}`;
          const wasApproved = currentProfile?.status === 'approved';
          await notificationService.notifyAdmins(
            wasApproved ? 'Profile update pending review' : 'Profile resubmitted',
            wasApproved
              ? `${displayName} updated an approved profile — needs confirmation.`
              : `${displayName} resubmitted their profile after rejection.`,
            {
              type: 'admin_profile_resubmitted',
              profileId: data.id,
              userName: displayName,
              wasApproved,
            },
            { excludeUserIds: [user.id] }
          );
        } catch (notifError) {
          console.error('Failed to notify admins:', notifError);
        }
      }

      return { success: true, profile: data, wasResubmitted: shouldResetStatus };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Switch the user's role between 'single' and 'matchmaker'.
   * - Snapshots current role-specific fields into `previous_role_data` for future restoration.
   * - If the user previously held the target role, restores those saved fields.
   * - Resets profile status to 'pending' for admin re-approval.
   */
  async switchRole(newRole: 'single' | 'matchmaker'): Promise<{
    success: boolean;
    profile?: Profile;
    error?: string;
  }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return { success: false, error: 'User not authenticated' };

      const { data: current, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError || !current) return { success: false, error: 'Profile not found' };

      const currentRole = current.role as 'single' | 'matchmaker';
      if (currentRole === newRole) return { success: false, error: 'Already on this role' };

      // Fields exclusive to singles
      const singleFields = [
        'what_looking_for', 'torah_learning', 'praying', 'is_cohen',
        'resume_url', 'wears_black_hat', 'plan_after_marriage', 'marital_status',
        'has_children', 'post_high_school_path', 'head_covering', 'dress_style',
      ];
      // Fields exclusive to matchmakers
      const matchmakerFields = ['religious_level', 'cultural_origin'];

      const fieldsToSnapshot = currentRole === 'single' ? singleFields : matchmakerFields;

      // Snapshot current role-specific fields
      const snapshot: Record<string, any> = {};
      for (const field of fieldsToSnapshot) {
        if (current[field] !== null && current[field] !== undefined) {
          snapshot[field] = current[field];
        }
      }

      const previousRoleData = {
        role: currentRole,
        saved_at: new Date().toISOString(),
        fields: snapshot,
      };

      // Check if there is saved data from a previous time in the target role
      const existingSaved = current.previous_role_data as {
        role: string;
        fields: Record<string, any>;
      } | null;
      const hasRestorable = existingSaved && existingSaved.role === newRole;

      // Build update payload: flip role, snapshot old data, reset status
      const updatePayload: Record<string, any> = {
        role: newRole,
        status: 'pending',
        rejection_reason: null,
        previous_role_data: previousRoleData,
        updated_at: new Date().toISOString(),
      };

      // Null out old role's exclusive fields on the profile
      for (const field of fieldsToSnapshot) {
        updatePayload[field] = null;
      }

      // Restore saved fields from previous time as target role
      if (hasRestorable && existingSaved) {
        for (const [field, value] of Object.entries(existingSaved.fields)) {
          updatePayload[field] = value;
        }
        // Consumed — clear so we don't accidentally restore again
        updatePayload.previous_role_data = previousRoleData;
      }

      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) return { success: false, error: updateError.message };

      // Notify admins about the role switch
      try {
        const displayName = `${current.first_name} ${current.last_name}`;
        await notificationService.notifyAdmins(
          'Profile role change pending review',
          `${displayName} switched from ${currentRole} to ${newRole} — needs approval.`,
          { type: 'admin_new_profile', profileId: current.id, userName: displayName },
          { excludeUserIds: [user.id] }
        );
      } catch (notifError) {
        console.error('Failed to notify admins of role switch:', notifError);
      }

      return { success: true, profile: updated };
    } catch (error) {
      console.error('Error switching role:', error);
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
    if (
      path.startsWith('http://') ||
      path.startsWith('https://') ||
      path.startsWith('data:') ||
      path.startsWith('blob:')
    ) {
      return path;
    }

    const { data } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Toggle email notifications for new matches (web opt-in).
   */
  async setNotifyMatchEmail(
    enabled: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('profiles')
        .update({ notify_match_email: enabled })
        .eq('user_id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating match email preference:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
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

  /**
   * Detect changes between old and new profile data
   */
  private detectChanges(oldProfile: any, newData: any, newPictures: string[]): {field: string, oldValue: any, newValue: any, displayName: string}[] {
    const changes: {field: string, oldValue: any, newValue: any, displayName: string}[] = [];

    // Field mappings for display names
    const fieldNames: Record<string, string> = {
      first_name: 'First Name',
      last_name: 'Last Name',
      bio: 'Bio',
      phone: 'Phone',
      email: 'Email',
      whatsapp: 'WhatsApp',
      dob: 'Date of Birth',
      height: 'Height',
      what_looking_for: 'What Looking For',
      location_city: 'City',
      location_state: 'State',
      location_country: 'Country',
      languages: 'Languages',
      nationality: 'Nationality',
      is_cohen: 'Is Cohen',
      hashkafa_type: 'Hashkafa Type',
      religious_level: 'Religious Level',
      cultural_origin: 'Cultural Origin',
      torah_learning: 'Torah Learning',
      praying: 'Praying',
      education_level: 'Education Level',
      post_high_school_path: 'Post High School Path',
      current_occupation_study: 'Current Occupation/Study',
      plan_after_marriage: 'Plan After Marriage',
      marital_status: 'Marital Status',
      dress_style: 'Dress Style',
      wears_black_hat: 'Wears Black Hat',
      head_covering: 'Head Covering',
      smoking: 'Smoking',
      alcohol_consumption: 'Alcohol Consumption',
      has_children: 'Has Children',
      resume_url: 'Resume',
      picture_privacy: 'Picture Privacy',
      matchmaker_id: 'Matchmaker',
    };

    // Helper to normalize values for comparison
    const normalize = (value: any): any => {
      if (value === null || value === undefined || value === '') return null;
      if (Array.isArray(value)) return value.sort().join(',');
      return String(value).trim();
    };

    // Check text fields
    const textFields = [
      'first_name', 'last_name', 'bio', 'phone', 'email', 'whatsapp', 'dob',
      'height', 'what_looking_for', 'location_city', 'location_state', 'location_country',
      'hashkafa_type', 'religious_level', 'cultural_origin', 'torah_learning', 'praying',
      'education_level', 'post_high_school_path', 'current_occupation_study',
      'plan_after_marriage', 'marital_status', 'dress_style', 'head_covering',
      'smoking', 'alcohol_consumption', 'resume_url', 'picture_privacy'
    ];

    for (const field of textFields) {
      const oldVal = normalize(oldProfile[field]);
      const newVal = normalize(newData[field]);
      if (oldVal !== newVal) {
        changes.push({
          field,
          oldValue: oldProfile[field],
          newValue: newData[field],
          displayName: fieldNames[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        });
      }
    }

    // Check array fields
    const arrayFields = ['languages', 'nationality'];
    for (const field of arrayFields) {
      const oldVal = normalize(oldProfile[field]);
      const newVal = normalize(newData[field]);
      if (oldVal !== newVal) {
        changes.push({
          field,
          oldValue: oldProfile[field],
          newValue: newData[field],
          displayName: fieldNames[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        });
      }
    }

    // Check boolean fields
    const booleanFields = ['is_cohen', 'wears_black_hat', 'has_children'];
    for (const field of booleanFields) {
      const oldVal = oldProfile[field];
      const newVal = newData[field];
      if (oldVal !== newVal && (oldVal !== null || newVal !== null)) {
        changes.push({
          field,
          oldValue: oldVal === null ? 'Not specified' : (oldVal ? 'Yes' : 'No'),
          newValue: newVal === null ? 'Not specified' : (newVal ? 'Yes' : 'No'),
          displayName: fieldNames[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
        });
      }
    }

    // Check pictures
    const oldPictures = Array.isArray(oldProfile.pictures) ? oldProfile.pictures : [];
    const oldPictureCount = oldPictures.length;
    const newPictureCount = newPictures.length;
    
    // Normalize picture paths for comparison
    const oldPaths = oldPictures.map((p: string) => this.extractStoragePath(p)).sort();
    const newPaths = newPictures.map((p: string) => this.extractStoragePath(p)).sort();
    const picturesChanged = JSON.stringify(oldPaths) !== JSON.stringify(newPaths);
    
    if (picturesChanged) {
      let pictureChangeText = '';
      if (newPictureCount > oldPictureCount) {
        const added = newPictureCount - oldPictureCount;
        pictureChangeText = `${added} image${added !== 1 ? 's' : ''} ${added === 1 ? 'was' : 'were'} added`;
      } else if (newPictureCount < oldPictureCount) {
        const removed = oldPictureCount - newPictureCount;
        pictureChangeText = `${removed} image${removed !== 1 ? 's' : ''} ${removed === 1 ? 'was' : 'were'} removed`;
      } else {
        pictureChangeText = `${newPictureCount} image${newPictureCount !== 1 ? 's' : ''} ${newPictureCount === 1 ? 'was' : 'were'} changed`;
      }
      
      changes.push({
        field: 'pictures',
        oldValue: oldPaths,
        newValue: newPaths,
        displayName: pictureChangeText
      });
    }

    // Check field_privacy changes
    const oldPrivacy = oldProfile.field_privacy || {};
    const newPrivacy = newData.field_privacy || {};
    const privacyChanged = JSON.stringify(oldPrivacy) !== JSON.stringify(newPrivacy);
    if (privacyChanged) {
      changes.push({
        field: 'field_privacy',
        oldValue: Object.keys(oldPrivacy).length > 0 ? `${Object.keys(oldPrivacy).length} private field(s)` : 'No private fields',
        newValue: Object.keys(newPrivacy).length > 0 ? `${Object.keys(newPrivacy).length} private field(s)` : 'No private fields',
        displayName: 'Privacy Settings'
      });
    }

    return changes;
  }

  /**
   * Get all singles who selected this user as their matchmaker
   * Works for both singles and matchmakers (since singles can also be selected as matchmakers)
   * Checks both:
   * 1. Profiles with matchmaker_id set to this user
   * 2. Intro requests where this user is the requester_middle_person_id or requested_middle_person_id
   */
  async getMySingles(): Promise<{ success: boolean; singles?: Profile[]; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get current user's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'Profile not found' };
      }

      // Parallelize independent queries: profile singles and intro requests
      const [profileSinglesQuery, introRequestsQuery] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('matchmaker_id', profile.id)
          .eq('role', 'single')
          .order('created_at', { ascending: false }),
        supabase
          .from('intro_requests')
          .select('requester_id, requested_profile_id, requester_middle_person_id, requested_middle_person_id')
          .or(`requester_middle_person_id.eq.${profile.id},requested_middle_person_id.eq.${profile.id}`),
      ]);

      const { data: profileSingles, error: profileSinglesError } = profileSinglesQuery;
      const { data: introRequests, error: introError } = introRequestsQuery;

      if (profileSinglesError) {
        console.error('Error fetching singles from profiles:', profileSinglesError);
      }

      if (introError) {
        console.error('Error fetching intro requests:', introError);
      }

      // Collect unique profile IDs from intro requests - only count profiles that selected this user as matchmaker
      const introRequestProfileIds = new Set<string>();
      if (introRequests) {
        introRequests.forEach(req => {
          // If requester selected this user as matchmaker, count the requester
          if (req.requester_middle_person_id === profile.id && req.requester_id) {
            introRequestProfileIds.add(req.requester_id);
          }
          // If requested person selected this user as matchmaker, count the requested person
          if (req.requested_middle_person_id === profile.id && req.requested_profile_id) {
            introRequestProfileIds.add(req.requested_profile_id);
          }
        });
      }

      // Get profiles for intro request singles
      let introRequestSingles: Profile[] = [];
      if (introRequestProfileIds.size > 0) {
        const { data: introSingles, error: introSinglesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', Array.from(introRequestProfileIds))
          .eq('role', 'single')
          .order('created_at', { ascending: false });

        if (introSinglesError) {
          console.error('Error fetching intro request singles:', introSinglesError);
        } else {
          introRequestSingles = introSingles || [];
        }
      }

      // Combine and deduplicate by profile ID
      const allSinglesMap = new Map<string, Profile>();
      
      // Add profile-based singles
      if (profileSingles) {
        profileSingles.forEach(single => {
          allSinglesMap.set(single.id, single);
        });
      }

      // Add intro request singles
      introRequestSingles.forEach(single => {
        allSinglesMap.set(single.id, single);
      });

      // Convert map to array and sort by created_at
      const allSingles = Array.from(allSinglesMap.values()).sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA;
      });

      return { success: true, singles: allSingles };
    } catch (error) {
      console.error('Unexpected error fetching singles:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Mark singles as viewed by updating the last_viewed_singles_at timestamp
   */
  async markSinglesAsViewed(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Update the profile with current timestamp
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          last_viewed_singles_at: new Date().toISOString() 
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error marking singles as viewed:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error marking singles as viewed:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Mark intro requests as viewed by updating the last_viewed_intro_requests_at timestamp
   */
  async markIntroRequestsAsViewed(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Update the profile with current timestamp
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          last_viewed_intro_requests_at: new Date().toISOString() 
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error marking intro requests as viewed:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error marking intro requests as viewed:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Mark matches as viewed by updating the last_viewed_matches_at timestamp
   */
  async markMatchesAsViewed(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Update the profile with current timestamp
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          last_viewed_matches_at: new Date().toISOString() 
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error marking matches as viewed:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error marking matches as viewed:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Mark suggestions as viewed by updating the last_viewed_suggestions_at timestamp
   */
  async markSuggestionsAsViewed(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Update the profile with current timestamp
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          last_viewed_suggestions_at: new Date().toISOString() 
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error marking suggestions as viewed:', updateError);
        return { success: false, error: updateError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error marking suggestions as viewed:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get count of new singles (created after last viewed timestamp)
   * Used for notification badges
   * Checks both profiles with matchmaker_id and intro requests
   */
  async getNewSinglesCount(): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get current user's profile with last_viewed_singles_at
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, last_viewed_singles_at')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'Profile not found' };
      }

      // Use last_viewed_singles_at if available, otherwise use 24 hours ago as fallback
      let cutoffDate: Date;
      if (profile.last_viewed_singles_at) {
        cutoffDate = new Date(profile.last_viewed_singles_at);
      } else {
        cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - 24);
      }

      // Parallelize independent queries: profile singles and intro requests
      const [profileSinglesQuery, recentIntroRequestsQuery] = await Promise.all([
        supabase
          .from('profiles')
          .select('id')
          .eq('matchmaker_id', profile.id)
          .eq('role', 'single')
          .gte('created_at', cutoffDate.toISOString()),
        supabase
          .from('intro_requests')
          .select('requester_id, requested_profile_id, requester_middle_person_id, requested_middle_person_id, created_at')
          .or(`requester_middle_person_id.eq.${profile.id},requested_middle_person_id.eq.${profile.id}`)
          .gte('created_at', cutoffDate.toISOString()),
      ]);

      const { data: profileSingles, error: profileCountError } = profileSinglesQuery;
      const { data: recentIntroRequests, error: introError } = recentIntroRequestsQuery;

      if (profileCountError) {
        console.error('Error counting new singles from profiles:', profileCountError);
      }

      if (introError) {
        console.error('Error counting new intro requests:', introError);
      }

      // Collect unique profile IDs from both sources
      const allProfileIds = new Set<string>();
      
      // Add profile-based singles
      if (profileSingles) {
        profileSingles.forEach(p => {
          if (p.id) allProfileIds.add(p.id);
        });
      }

      // Add intro request profile IDs - only count the profile that selected this user as matchmaker
      if (recentIntroRequests) {
        recentIntroRequests.forEach(req => {
          // If requester selected this user as matchmaker, count the requester
          if (req.requester_middle_person_id === profile.id && req.requester_id) {
            allProfileIds.add(req.requester_id);
          }
          // If requested person selected this user as matchmaker, count the requested person
          if (req.requested_middle_person_id === profile.id && req.requested_profile_id) {
            allProfileIds.add(req.requested_profile_id);
          }
        });
      }

      // Get count of unique singles from all sources
      let totalCount = 0;
      if (allProfileIds.size > 0) {
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .in('id', Array.from(allProfileIds))
          .eq('role', 'single');

        if (countError) {
          console.error('Error counting unique singles:', countError);
        } else {
          totalCount = count || 0;
        }
      }

      return { success: true, count: totalCount };
    } catch (error) {
      console.error('Unexpected error counting new singles:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Format change summary for display
   */
  private formatChangeSummary(changes: {field: string, oldValue: any, newValue: any, displayName: string}[]): string {
    if (changes.length === 0) return 'No changes detected';
    
    const summaries: string[] = [];
    
    // Group changes by category
    const nameChanges = changes.filter(c => c.field === 'first_name' || c.field === 'last_name');
    const pictureChanges = changes.filter(c => c.field === 'pictures');
    const otherChanges = changes.filter(c => c.field !== 'first_name' && c.field !== 'last_name' && c.field !== 'pictures');
    
    // Name changes
    if (nameChanges.length > 0) {
      if (nameChanges.length === 2) {
        summaries.push(`Name changed from "${nameChanges.find(c => c.field === 'first_name')?.oldValue} ${nameChanges.find(c => c.field === 'last_name')?.oldValue}" to "${nameChanges.find(c => c.field === 'first_name')?.newValue} ${nameChanges.find(c => c.field === 'last_name')?.newValue}"`);
      } else {
        nameChanges.forEach(change => {
          summaries.push(`${change.displayName} changed`);
        });
      }
    }
    
    // Picture changes
    if (pictureChanges.length > 0) {
      const picChange = pictureChanges[0];
      // The displayName already contains the formatted change text
      summaries.push(picChange.displayName);
    }
    
    // Other changes
    if (otherChanges.length > 0) {
      if (otherChanges.length === 1) {
        summaries.push(`${otherChanges[0].displayName} was changed`);
      } else {
        summaries.push(`${otherChanges.length} other field${otherChanges.length !== 1 ? 's' : ''} were changed`);
      }
    }
    
    return summaries.join(', ');
  }
}

export const profileService = new ProfileService();

