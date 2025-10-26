import { supabase } from './supabase';

export interface Suggestion {
  id: string;
  suggester_id: string;
  suggested_profile_id: string;
  matchmaker_id?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InfoRequest {
  id: string;
  requester_id: string;
  requested_profile_id: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  created_at: string;
  updated_at: string;
}

export interface SuggestionWithDetails {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  notes?: string;
  created_at: string;
  updated_at: string;
  suggested_profile: {
    id: string;
    first_name: string;
    last_name: string;
    pictures?: any;
  };
  matchmaker?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  suggester_profile?: {
    id: string;
    first_name: string;
    last_name: string;
    pictures?: any;
  };
}

export interface InfoRequestWithDetails {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  created_at: string;
  updated_at: string;
  requested_profile: {
    id: string;
    first_name: string;
    last_name: string;
    pictures?: any;
  };
}

class SuggestionService {
  /**
   * Create a shidduch suggestion
   */
  async createSuggestion(
    suggestedProfileId: string,
    matchmakerId?: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string; suggestion?: Suggestion }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get current user's profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        console.error('User profile not found', profileError);  
        return { success: false, error: 'User profile not found' };
      }

      const { data, error } = await supabase
        .from('suggestions')
        .insert({
          suggester_id: userProfile.id,
          suggested_profile_id: suggestedProfileId,
          matchmaker_id: matchmakerId,
          notes: notes,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return { success: false, error: 'You have already suggested this profile' };
        }
        return { success: false, error: error.message };
      }

      return { success: true, suggestion: data };
    } catch (error) {
      console.error('Error creating suggestion:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get user's suggestions
   */
  async getUserSuggestions(): Promise<{ success: boolean; suggestions?: Suggestion[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        return { success: false, error: 'User profile not found' };
      }

      const { data, error } = await supabase
        .from('suggestions')
        .select('*')
        .eq('suggester_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, suggestions: data };
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get user's suggestions with profile details
   */
  async getUserSuggestionsWithDetails(): Promise<{ 
    success: boolean; 
    suggestions?: SuggestionWithDetails[]; 
    error?: string 
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user found');
        return { success: false, error: 'User not authenticated' };
      }

      console.log('Fetching profile for user:', user.id);

      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        console.error('User profile not found', profileError);
        // Return empty array instead of error if profile doesn't exist yet
        return { success: true, suggestions: [] };
      }

      console.log('Fetching suggestions for profile:', userProfile.id);

      const { data, error } = await supabase
        .from('suggestions')
        .select(`
          id,
          status,
          notes,
          created_at,
          updated_at,
          suggested_profile:profiles!suggestions_suggested_profile_id_fkey(
            id,
            first_name,
            last_name,
            pictures
          ),
          matchmaker:profiles!suggestions_matchmaker_id_fkey(
            id,
            first_name,
            last_name
          )
        `)
        .eq('suggester_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching suggestions with details:', error);
        return { success: false, error: error.message };
      }

      console.log('Fetched suggestions:', data?.length || 0);
      return { success: true, suggestions: data as any };
    } catch (error) {
      console.error('Error fetching suggestions with details:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Create an info request
   */
  async createInfoRequest(
    requestedProfileId: string,
    message?: string
  ): Promise<{ success: boolean; error?: string; request?: InfoRequest }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get current user's profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        return { success: false, error: 'User profile not found' };
      }

      const { data, error } = await supabase
        .from('info_requests')
        .insert({
          requester_id: userProfile.id,
          requested_profile_id: requestedProfileId,
          message: message,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          return { success: false, error: 'You have already requested info from this profile' };
        }
        return { success: false, error: error.message };
      }

      return { success: true, request: data };
    } catch (error) {
      console.error('Error creating info request:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get user's info requests
   */
  async getUserInfoRequests(): Promise<{ success: boolean; requests?: InfoRequest[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        return { success: false, error: 'User profile not found' };
      }

      const { data, error } = await supabase
        .from('info_requests')
        .select('*')
        .eq('requester_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, requests: data };
    } catch (error) {
      console.error('Error fetching info requests:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get info requests received by the user (others requesting their info)
   */
  async getReceivedInfoRequests(): Promise<{ 
    success: boolean; 
    requests?: InfoRequestWithDetails[]; 
    error?: string 
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user found');
        return { success: false, error: 'User not authenticated' };
      }

      console.log('Fetching profile for user:', user.id);

      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        console.error('User profile not found', profileError);
        return { success: true, requests: [] };
      }

      console.log('Fetching received info requests for profile:', userProfile.id);

      const { data, error } = await supabase
        .from('info_requests')
        .select(`
          id,
          status,
          message,
          created_at,
          updated_at,
          requester_id,
          requester_profile:profiles!info_requests_requester_id_fkey(
            id,
            first_name,
            last_name,
            pictures
          )
        `)
        .eq('requested_profile_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching received info requests:', error);
        return { success: false, error: error.message };
      }

      console.log('Fetched received info requests:', data?.length || 0);
      
      // Transform to match InfoRequestWithDetails format
      const transformedData = data?.map(item => ({
        id: item.id,
        status: item.status,
        message: item.message,
        created_at: item.created_at,
        updated_at: item.updated_at,
        requested_profile: item.requester_profile, // Use requester as the "profile" for display
      }));

      return { success: true, requests: transformedData as any };
    } catch (error) {
      console.error('Error fetching received info requests:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Update info request status (approve/reject)
   */
  async updateInfoRequestStatus(
    requestId: string, 
    status: 'approved' | 'rejected'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('info_requests')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error updating info request:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating info request:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get user's info requests with profile details
   */
  async getUserInfoRequestsWithDetails(): Promise<{ 
    success: boolean; 
    requests?: InfoRequestWithDetails[]; 
    error?: string 
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user found');
        return { success: false, error: 'User not authenticated' };
      }

      console.log('Fetching profile for user:', user.id);

      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        console.error('User profile not found', profileError);
        // Return empty array instead of error if profile doesn't exist yet
        return { success: true, requests: [] };
      }

      console.log('Fetching info requests for profile:', userProfile.id);

      const { data, error } = await supabase
        .from('info_requests')
        .select(`
          id,
          status,
          message,
          created_at,
          updated_at,
          requested_profile:profiles!info_requests_requested_profile_id_fkey(
            id,
            first_name,
            last_name,
            pictures
          )
        `)
        .eq('requester_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching info requests with details:', error);
        return { success: false, error: error.message };
      }

      console.log('Fetched info requests:', data?.length || 0);
      return { success: true, requests: data as any };
    } catch (error) {
      console.error('Error fetching info requests with details:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get suggestions received by the user (where they are the suggested profile)
   */
  async getReceivedSuggestions(): Promise<{ 
    success: boolean; 
    suggestions?: SuggestionWithDetails[]; 
    error?: string 
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user found');
        return { success: false, error: 'User not authenticated' };
      }

      console.log('Fetching profile for user:', user.id);

      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        console.error('User profile not found', profileError);
        return { success: true, suggestions: [] };
      }

      console.log('Fetching received suggestions for profile:', userProfile.id);

      const { data, error } = await supabase
        .from('suggestions')
        .select(`
          id,
          status,
          notes,
          created_at,
          updated_at,
          suggested_profile:profiles!suggestions_suggester_id_fkey(
            id,
            first_name,
            last_name,
            pictures
          )
        `)
        .eq('suggested_profile_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching received suggestions:', error);
        return { success: false, error: error.message };
      }

      console.log('Fetched received suggestions:', data?.length || 0);
      return { success: true, suggestions: data as any };
    } catch (error) {
      console.error('Error fetching received suggestions:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get suggestions where the current user is the matchmaker
   */
  async getMatchmakerSuggestions(): Promise<{ 
    success: boolean; 
    suggestions?: SuggestionWithDetails[]; 
    error?: string 
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('No authenticated user found');
        return { success: false, error: 'User not authenticated' };
      }

      console.log('Fetching profile for user:', user.id);

      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        console.error('User profile not found', profileError);
        return { success: true, suggestions: [] };
      }

      console.log('Fetching matchmaker suggestions for profile:', userProfile.id);

      const { data, error } = await supabase
        .from('suggestions')
        .select(`
          id,
          status,
          notes,
          created_at,
          updated_at,
          suggester_profile:profiles!suggestions_suggester_id_fkey(
            id,
            first_name,
            last_name,
            pictures
          ),
          suggested_profile:profiles!suggestions_suggested_profile_id_fkey(
            id,
            first_name,
            last_name,
            pictures
          )
        `)
        .eq('matchmaker_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching matchmaker suggestions:', error);
        return { success: false, error: error.message };
      }

      console.log('Fetched matchmaker suggestions:', data?.length || 0);
      
      // Transform to include both profiles
      const transformedData = data?.map(item => ({
        id: item.id,
        status: item.status,
        notes: item.notes,
        created_at: item.created_at,
        updated_at: item.updated_at,
        suggester_profile: item.suggester_profile,
        suggested_profile: item.suggested_profile,
      }));

      return { success: true, suggestions: transformedData as any };
    } catch (error) {
      console.error('Error fetching matchmaker suggestions:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}

export const suggestionService = new SuggestionService();

