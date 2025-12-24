import { supabase } from './supabase';

export interface Engagement {
  id: string;
  user1_id: string;
  user2_id: string;
  user1_confirmed: boolean;
  user2_confirmed: boolean;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EngagementWithProfiles extends Engagement {
  user1_profile: {
    first_name: string;
    last_name: string;
    pictures: any;
  } | null;
  user2_profile: {
    first_name: string;
    last_name: string;
    pictures: any;
  } | null;
}

class EngagementService {
  /**
   * Propose or confirm engagement with another user
   */
  async proposeEngagement(otherUserId: string): Promise<{ success: boolean; engagement?: Engagement; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      console.log('proposeEngagement called by:', user.id, 'for:', otherUserId);

      // Ensure user1_id is always less than user2_id for consistency
      const [user1Id, user2Id] = [user.id, otherUserId].sort();
      console.log('Sorted IDs - user1Id:', user1Id, 'user2Id:', user2Id);

      // Check if engagement already exists
      const { data: existing, error: fetchError } = await supabase
        .from('engagements')
        .select('*')
        .eq('user1_id', user1Id)
        .eq('user2_id', user2Id)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking existing engagement:', fetchError);
        return { success: false, error: fetchError.message };
      }

      console.log('Existing engagement:', existing);

      if (existing) {
        // Update confirmation for current user
        const isUser1 = user.id === user1Id;
        const updateField = isUser1 ? 'user1_confirmed' : 'user2_confirmed';

        console.log('Updating engagement - isUser1:', isUser1, 'updateField:', updateField);

        const { data, error: updateError } = await supabase
          .from('engagements')
          .update({ [updateField]: true })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating engagement:', updateError);
          return { success: false, error: updateError.message };
        }

        console.log('Updated engagement:', data);
        return { success: true, engagement: data };
      } else {
        // Create new engagement with current user's confirmation
        const isUser1 = user.id === user1Id;
        const newEngagement = {
          user1_id: user1Id,
          user2_id: user2Id,
          user1_confirmed: isUser1 ? true : false,
          user2_confirmed: isUser1 ? false : true,
        };

        console.log('Creating new engagement:', newEngagement);

        const { data, error: insertError } = await supabase
          .from('engagements')
          .insert(newEngagement)
          .select()
          .single();

        if (insertError) {
          console.error('Error creating engagement:', insertError);
          return { success: false, error: insertError.message };
        }

        console.log('Created engagement:', data);
        return { success: true, engagement: data };
      }
    } catch (error) {
      console.error('Error in proposeEngagement:', error);
      return { success: false, error: 'Failed to propose engagement' };
    }
  }

  /**
   * Get engagement status with another user
   */
  async getEngagementStatus(otherUserId: string): Promise<{ success: boolean; engagement?: Engagement | null; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      console.log('getEngagementStatus called by:', user.id, 'for:', otherUserId);

      const [user1Id, user2Id] = [user.id, otherUserId].sort();
      console.log('Querying engagement - user1Id:', user1Id, 'user2Id:', user2Id);

      const { data, error } = await supabase
        .from('engagements')
        .select('*')
        .eq('user1_id', user1Id)
        .eq('user2_id', user2Id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching engagement status:', error);
        return { success: false, error: error.message };
      }

      console.log('Found engagement:', data);
      return { success: true, engagement: data };
    } catch (error) {
      console.error('Error in getEngagementStatus:', error);
      return { success: false, error: 'Failed to get engagement status' };
    }
  }

  /**
   * Get all confirmed engagements (successful matches)
   */
  async getConfirmedEngagements(): Promise<{ success: boolean; engagements?: EngagementWithProfiles[]; count?: number; error?: string }> {
    try {
      // Fetch engagements
      const { data: engagementsData, error: engagementsError } = await supabase
        .from('engagements')
        .select('*')
        .eq('user1_confirmed', true)
        .eq('user2_confirmed', true)
        .not('confirmed_at', 'is', null)
        .order('confirmed_at', { ascending: false });

      if (engagementsError) {
        console.error('Error fetching confirmed engagements:', engagementsError);
        return { success: false, error: engagementsError.message };
      }

      if (!engagementsData || engagementsData.length === 0) {
        return { success: true, engagements: [], count: 0 };
      }

      // Get all user IDs
      const userIds = [...new Set(engagementsData.flatMap(e => [e.user1_id, e.user2_id]))];

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, pictures')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return { success: false, error: profilesError.message };
      }

      // Create a map of user_id to profile
      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );

      // Combine engagements with profile data
      const engagementsWithProfiles: EngagementWithProfiles[] = engagementsData.map(engagement => ({
        ...engagement,
        user1_profile: profilesMap.get(engagement.user1_id) || null,
        user2_profile: profilesMap.get(engagement.user2_id) || null,
      }));

      return { success: true, engagements: engagementsWithProfiles, count: engagementsWithProfiles.length };
    } catch (error) {
      console.error('Error in getConfirmedEngagements:', error);
      return { success: false, error: 'Failed to fetch confirmed engagements' };
    }
  }

  /**
   * Get current user's engagement (if any)
   */
  async getMyEngagement(): Promise<{ success: boolean; engagement?: EngagementWithProfiles | null; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Fetch engagement
      const { data: engagementData, error: engagementError } = await supabase
        .from('engagements')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('user1_confirmed', true)
        .eq('user2_confirmed', true)
        .maybeSingle();

      if (engagementError) {
        console.error('Error fetching my engagement:', engagementError);
        return { success: false, error: engagementError.message };
      }

      if (!engagementData) {
        return { success: true, engagement: null };
      }

      // Fetch profiles for both users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, pictures')
        .in('user_id', [engagementData.user1_id, engagementData.user2_id]);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return { success: false, error: profilesError.message };
      }

      // Create profile map
      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );

      // Combine engagement with profile data
      const engagementWithProfiles: EngagementWithProfiles = {
        ...engagementData,
        user1_profile: profilesMap.get(engagementData.user1_id) || null,
        user2_profile: profilesMap.get(engagementData.user2_id) || null,
      };

      return { success: true, engagement: engagementWithProfiles };
    } catch (error) {
      console.error('Error in getMyEngagement:', error);
      return { success: false, error: 'Failed to fetch engagement' };
    }
  }

  /**
   * Delete engagement (undo) - using other user's ID
   */
  async undoEngagement(otherUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const [user1Id, user2Id] = [user.id, otherUserId].sort();

      const { error } = await supabase
        .from('engagements')
        .delete()
        .eq('user1_id', user1Id)
        .eq('user2_id', user2Id);

      if (error) {
        console.error('Error deleting engagement:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in undoEngagement:', error);
      return { success: false, error: 'Failed to undo engagement' };
    }
  }

  /**
   * Get pending engagement requests (where other user confirmed but current user hasn't)
   */
  async getPendingEngagementRequest(): Promise<{ success: boolean; engagement?: Engagement | null; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase
        .from('engagements')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .or(`user1_confirmed.eq.false,user2_confirmed.eq.false`)
        .maybeSingle();

      if (error) {
        console.error('Error fetching pending request:', error);
        return { success: false, error: error.message };
      }

      // Check if the current user hasn't confirmed yet
      if (data) {
        const isUser1 = user.id === data.user1_id;
        const userConfirmed = isUser1 ? data.user1_confirmed : data.user2_confirmed;
        const otherConfirmed = isUser1 ? data.user2_confirmed : data.user1_confirmed;

        if (!userConfirmed && otherConfirmed) {
          return { success: true, engagement: data };
        }
      }

      return { success: true, engagement: null };
    } catch (error) {
      console.error('Error in getPendingEngagementRequest:', error);
      return { success: false, error: 'Failed to fetch pending request' };
    }
  }
}

export const engagementService = new EngagementService();

