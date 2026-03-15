import { notificationService } from './notificationService';
import { Profile } from './profileService';
import { supabase, supabaseUrl } from './supabase';

class AdminService {
  /**
   * Check if current user is an admin
   */
  async isAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return false;

      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Get all pending profiles
   */
  async getPendingProfiles(): Promise<{ success: boolean; profiles?: Profile[]; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/get-pending-profiles`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to fetch pending profiles' };
      }

      return { success: true, profiles: data.profiles };
    } catch (error) {
      console.error('Error fetching pending profiles:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Approve a profile
   */
  async approveProfile(profileId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/approve-profile`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ profileId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to approve profile' };
      }

      // Notify the user their profile was approved
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id, is_update')
          .eq('id', profileId)
          .single();

        if (profile?.user_id) {
          await notificationService.sendNotification(
            profile.user_id,
            '✅ Profile Approved!',
            profile.is_update
              ? 'Your profile update has been approved and you can use the app again.'
              : 'Your profile has been approved and is now visible to other users.',
            { type: 'profile_approved', profileId }
          );
        }
      } catch {
        // Notification failure should not block the approval
      }

      return { success: true };
    } catch (error) {
      console.error('Error approving profile:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Reject a profile
   */
  async rejectProfile(profileId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/reject-profile`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ profileId, reason }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to reject profile' };
      }

      // Notify the user their profile was rejected
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('id', profileId)
          .single();

        if (profile?.user_id) {
          await notificationService.sendNotification(
            profile.user_id,
            '⚠️ Profile Needs Attention',
            `Your profile requires updates: ${reason}`,
            { type: 'profile_rejected', profileId, reason }
          );
        }
      } catch {
        // Notification failure should not block the rejection
      }

      return { success: true };
    } catch (error) {
      console.error('Error rejecting profile:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
  /**
   * Get all users with optional search and pagination
   */
  async getAllUsers(query?: string): Promise<{ success: boolean; profiles?: Profile[]; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/get-all-users`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to fetch users' };
      }

      return { success: true, profiles: data.profiles };
    } catch (error) {
      console.error('Error fetching users:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Perform admin action on a user
   */
  async performAdminAction(
    userId: string, 
    action: 'freeze' | 'unfreeze' | 'suspend' | 'unsuspend' | 'remove', 
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { success: false, error: 'Not authenticated' };
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/admin-action`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, action, reason }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || `Failed to ${action} user` };
      }

      return { success: true };
    } catch (error) {
      console.error(`Error performing admin action ${action}:`, error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}

export const adminService = new AdminService();

