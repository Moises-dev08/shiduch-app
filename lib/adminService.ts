import { notificationService } from './notificationService';
import { Profile } from './profileService';
import { supabase, supabaseUrl } from './supabase';

class AdminService {
  async isSuperAdmin(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const { data, error } = await supabase
        .from('admin_users')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .single();
      return !error && !!data?.is_super_admin;
    } catch {
      return false;
    }
  }

  async listAdmins(): Promise<{ success: boolean; admins?: { id: string; user_id: string; email: string; is_super_admin: boolean; created_at: string }[]; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { success: false, error: 'Not authenticated' };
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-manage-admins`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' }),
      });
      const data = await response.json();
      if (!response.ok) return { success: false, error: data.error || 'Failed to list admins' };
      return { success: true, admins: data.admins };
    } catch (error: any) { return { success: false, error: error.message }; }
  }

  async addAdmin(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { success: false, error: 'Not authenticated' };
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-manage-admins`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', email }),
      });
      const data = await response.json();
      if (!response.ok) return { success: false, error: data.error || 'Failed to add admin' };
      return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
  }

  async removeAdmin(adminId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { success: false, error: 'Not authenticated' };
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-manage-admins`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', adminId }),
      });
      const data = await response.json();
      if (!response.ok) return { success: false, error: data.error || 'Failed to remove admin' };
      return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
  }

  async setSuperAdmin(adminId: string, value: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { success: false, error: 'Not authenticated' };
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-manage-admins`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_super', adminId, value }),
      });
      const data = await response.json();
      if (!response.ok) return { success: false, error: data.error || 'Failed to update super admin status' };
      return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
  }

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
   * Load one profile for admin review (includes photos even when privacy is "none").
   */
  async getProfileForReview(
    profileId: string
  ): Promise<{ success: boolean; profile?: Profile; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error || !data) {
        return { success: false, error: error?.message || 'Profile not found' };
      }

      const hasApprovedAt = data.approved_at !== null;
      const timeDiff =
        new Date(data.updated_at).getTime() - new Date(data.created_at).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      const isUpdate = hasApprovedAt || hoursDiff > 1;

      return {
        success: true,
        profile: {
          ...data,
          is_update: isUpdate,
          last_approved_at: data.approved_at,
        } as Profile,
      };
    } catch (error) {
      console.error('Error fetching profile for review:', error);
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

      // Real columns only — is_update is computed in get-pending-profiles, not in DB.
      // approved_at != null while pending ⇒ previously approved resubmission (same rule as dashboard).
      const { data: profileMeta, error: metaError } = await supabase
        .from('profiles')
        .select('user_id, approved_at')
        .eq('id', profileId)
        .single();

      if (metaError) {
        console.warn('approveProfile: could not load profile meta', metaError.message);
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

      const ownerUserId = profileMeta?.user_id ?? data.profile?.user_id;
      const isUpdate = !!profileMeta?.approved_at;

      // Notify the profile owner (not the admin)
      try {
        if (ownerUserId) {
          await notificationService.sendNotification(
            ownerUserId,
            '✅ Profile Approved!',
            isUpdate
              ? 'Your profile update has been approved successfully.'
              : 'Your profile has been approved and is now visible to other users.',
            {
              type: isUpdate ? 'profile_update_approved' : 'profile_approved',
              profileId,
            }
          );
        } else {
          console.warn('approveProfile: no user_id for approval notification');
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

      const { data: profileMeta, error: metaError } = await supabase
        .from('profiles')
        .select('user_id, approved_at')
        .eq('id', profileId)
        .single();

      if (metaError) {
        console.warn('rejectProfile: could not load profile meta', metaError.message);
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

      const ownerUserId = profileMeta?.user_id ?? data.profile?.user_id;
      const isUpdate = !!profileMeta?.approved_at;

      try {
        if (ownerUserId) {
          await notificationService.sendNotification(
            ownerUserId,
            isUpdate ? '⚠️ Profile Update Rejected' : '⚠️ Profile Needs Attention',
            isUpdate
              ? `Your profile update was not approved: ${reason}`
              : `Your profile requires updates: ${reason}`,
            {
              type: isUpdate ? 'profile_update_rejected' : 'profile_rejected',
              profileId,
              reason,
            }
          );
        } else {
          console.warn('rejectProfile: no user_id for rejection notification');
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
   * Every profile an admin can open, including people past the old list limit.
   * Direct pages are merged with the admin function so a hidden row is not dropped.
   */
  async getAllUsers(query?: string): Promise<{ success: boolean; profiles?: Profile[]; error?: string }> {
    const [paged, remote] = await Promise.all([
      this.pageAllProfiles(),
      this.getAllUsersFromFunction(query),
    ]);

    const merged = new Map<string, Profile>();
    for (const profile of remote.profiles ?? []) {
      merged.set(profile.id, profile);
    }
    for (const profile of paged.profiles ?? []) {
      merged.set(profile.id, profile);
    }

    if (merged.size === 0) {
      return {
        success: false,
        error: paged.error || remote.error || 'Failed to fetch users',
      };
    }

    const needle = query?.trim().toLowerCase() ?? '';
    const profiles = Array.from(merged.values()).filter((profile) => {
      if (!needle) return true;
      const haystack = `${profile.first_name ?? ''} ${profile.last_name ?? ''} ${profile.email ?? ''}`.toLowerCase();
      return haystack.includes(needle);
    });
    profiles.sort((a, b) => {
      const last = (a.last_name || '').localeCompare(b.last_name || '', undefined, { sensitivity: 'base' });
      if (last !== 0) return last;
      return (a.first_name || '').localeCompare(b.first_name || '', undefined, { sensitivity: 'base' });
    });
    return { success: true, profiles };
  }

  async getUserProfile(
    userId?: string,
    profileId?: string,
  ): Promise<{ success: boolean; profile?: Profile; error?: string }> {
    try {
      if (profileId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profileId)
          .maybeSingle();
        if (data) return { success: true, profile: data as Profile };
        if (error) console.warn('getUserProfile by id:', error.message);
      }

      if (userId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (data) return { success: true, profile: data as Profile };
        if (error) console.warn('getUserProfile by user:', error.message);
      }

      const all = await this.getAllUsers();
      const found = all.profiles?.find(
        (profile) =>
          (profileId ? profile.id === profileId : false) ||
          (userId ? profile.user_id === userId : false),
      );
      if (found) return { success: true, profile: found };
      return { success: false, error: 'User not found' };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  private async pageAllProfiles(): Promise<{ profiles?: Profile[]; error?: string }> {
    const pageSize = 500;
    const profiles: Profile[] = [];
    try {
      for (let from = 0; from < 20000; from += pageSize) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('id', { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) return { profiles, error: error.message };
        const rows = (data ?? []) as Profile[];
        profiles.push(...rows);
        if (rows.length < pageSize) break;
      }
      return { profiles };
    } catch (error) {
      console.error('Error paging profiles:', error);
      return { profiles, error: 'An unexpected error occurred' };
    }
  }

  private async getAllUsersFromFunction(
    query?: string,
  ): Promise<{ success: boolean; profiles?: Profile[]; error?: string }> {
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
    action: 'freeze' | 'unfreeze' | 'suspend' | 'unsuspend' | 'remove' | 'restore', 
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

