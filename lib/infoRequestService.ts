import { supabase } from './supabase';

export interface InfoRequest {
  id: string;
  requester_id: string;
  requested_profile_id: string;
  field_name: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  responded_at?: string;
  requester_profile?: {
    id: string;
    first_name: string;
    last_name: string;
    gender: string;
    pictures: string[];
    picture_privacy: string;
    location_city?: string;
    location_state?: string;
    location_country?: string;
    dob?: string;
  };
  requested_profile?: {
    id: string;
    first_name: string;
    last_name: string;
    gender: string;
    pictures: string[];
    picture_privacy: string;
    location_city?: string;
    location_state?: string;
    location_country?: string;
    dob?: string;
  };
}

class InfoRequestService {
  /**
   * Create a new information request
   */
  async createInfoRequest(
    requestedProfileId: string,
    fieldName: string,
    message: string
  ): Promise<{ success: boolean; request?: InfoRequest; error?: string }> {
    try {
      // Get current user's profile
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'User profile not found' };
      }

      // Create the info request
      const { data, error } = await supabase
        .from('info_requests')
        .insert({
          requester_id: profile.id,
          requested_profile_id: requestedProfileId,
          field_name: fieldName,
          message: message,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating info request:', error);
        return { success: false, error: error.message };
      }

      return { success: true, request: data };
    } catch (error) {
      console.error('Unexpected error creating info request:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get info requests sent by current user
   */
  async getSentRequests(): Promise<{ success: boolean; requests?: InfoRequest[]; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'User profile not found' };
      }

      const { data, error } = await supabase
        .from('info_requests')
        .select(`
          *,
          requested_profile:requested_profile_id (
            id,
            first_name,
            last_name,
            gender,
            pictures,
            picture_privacy,
            location_city,
            location_state,
            location_country,
            dob
          )
        `)
        .eq('requester_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sent requests:', error);
        return { success: false, error: error.message };
      }

      return { success: true, requests: data };
    } catch (error) {
      console.error('Unexpected error fetching sent requests:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get info requests received by current user
   */
  async getReceivedRequests(): Promise<{ success: boolean; requests?: InfoRequest[]; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'User profile not found' };
      }

      const { data, error } = await supabase
        .from('info_requests')
        .select(`
          *,
          requester_profile:requester_id (
            id,
            first_name,
            last_name,
            gender,
            pictures,
            picture_privacy,
            location_city,
            location_state,
            location_country,
            dob
          )
        `)
        .eq('requested_profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching received requests:', error);
        return { success: false, error: error.message };
      }

      return { success: true, requests: data };
    } catch (error) {
      console.error('Unexpected error fetching received requests:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Respond to an info request (approve or reject)
   */
  async respondToRequest(
    requestId: string,
    status: 'approved' | 'rejected'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('info_requests')
        .update({
          status: status,
          responded_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error responding to request:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error responding to request:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Check if user has pending request for a specific field
   */
  async hasPendingRequest(
    requestedProfileId: string,
    fieldName: string
  ): Promise<{ success: boolean; hasPending?: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'User profile not found' };
      }

      const { data, error } = await supabase
        .from('info_requests')
        .select('id')
        .eq('requester_id', profile.id)
        .eq('requested_profile_id', requestedProfileId)
        .eq('field_name', fieldName)
        .eq('status', 'pending')
        .limit(1);

      if (error) {
        console.error('Error checking pending request:', error);
        return { success: false, error: error.message };
      }

      return { success: true, hasPending: data && data.length > 0 };
    } catch (error) {
      console.error('Unexpected error checking pending request:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Check if a request was approved for a specific field
   */
  async hasApprovedRequest(
    requestedProfileId: string,
    fieldName: string
  ): Promise<{ success: boolean; hasApproved?: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        return { success: false, error: 'User profile not found' };
      }

      const { data, error } = await supabase
        .from('info_requests')
        .select('id')
        .eq('requester_id', profile.id)
        .eq('requested_profile_id', requestedProfileId)
        .eq('field_name', fieldName)
        .eq('status', 'approved')
        .limit(1);

      if (error) {
        console.error('Error checking approved request:', error);
        return { success: false, error: error.message };
      }

      return { success: true, hasApproved: data && data.length > 0 };
    } catch (error) {
      console.error('Unexpected error checking approved request:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}

export const infoRequestService = new InfoRequestService();

