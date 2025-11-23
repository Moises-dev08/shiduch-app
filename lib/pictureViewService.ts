import { supabase } from './supabase';

export interface PictureView {
  id: string;
  viewer_profile_id: string;
  viewed_profile_id: string;
  viewed_at: string;
}

class PictureViewService {
  /**
   * Check if current user has already viewed a profile's pictures
   */
  async hasViewedPictures(viewedProfileId: string): Promise<{ success: boolean; hasViewed: boolean; error?: string }> {
    try {
      // Get current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, hasViewed: false, error: 'Not authenticated' };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        return { success: false, hasViewed: false, error: 'Profile not found' };
      }

      // Check if there's a record of this view
      const { data, error } = await supabase
        .from('picture_views')
        .select('id')
        .eq('viewer_profile_id', profile.id)
        .eq('viewed_profile_id', viewedProfileId)
        .maybeSingle();

      if (error) {
        console.error('Error checking picture view:', error);
        return { success: false, hasViewed: false, error: error.message };
      }

      return { success: true, hasViewed: !!data };
    } catch (error: any) {
      console.error('Error in hasViewedPictures:', error);
      return { success: false, hasViewed: false, error: error.message };
    }
  }

  /**
   * Record that current user has viewed a profile's pictures
   */
  async recordPictureView(viewedProfileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        return { success: false, error: 'Profile not found' };
      }

      // Don't record if user is viewing their own profile
      if (profile.id === viewedProfileId) {
        return { success: true };
      }

      // Insert or update the view record
      const { error } = await supabase
        .from('picture_views')
        .upsert({
          viewer_profile_id: profile.id,
          viewed_profile_id: viewedProfileId,
          viewed_at: new Date().toISOString()
        }, {
          onConflict: 'viewer_profile_id,viewed_profile_id'
        });

      if (error) {
        console.error('Error recording picture view:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in recordPictureView:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all profiles whose pictures have been viewed by current user
   */
  async getViewedProfiles(): Promise<{ success: boolean; viewedProfileIds?: string[]; error?: string }> {
    try {
      // Get current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        return { success: false, error: 'Profile not found' };
      }

      // Get all viewed profile IDs
      const { data, error } = await supabase
        .from('picture_views')
        .select('viewed_profile_id')
        .eq('viewer_profile_id', profile.id);

      if (error) {
        console.error('Error getting viewed profiles:', error);
        return { success: false, error: error.message };
      }

      const viewedProfileIds = data?.map(v => v.viewed_profile_id) || [];
      return { success: true, viewedProfileIds };
    } catch (error: any) {
      console.error('Error in getViewedProfiles:', error);
      return { success: false, error: error.message };
    }
  }
}

export const pictureViewService = new PictureViewService();

