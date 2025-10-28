import { supabase } from './supabase';

export interface Suggestion {
  id: string;
  suggester_id: string;
  suggested_profile_id: string;
  matchmaker_id?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  notes?: string;
  suggester_continuation_choice?: 'by_themselves' | 'with_middle_person';
  suggested_continuation_choice?: 'by_themselves' | 'with_middle_person';
  suggester_matchmaker_id?: string;
  suggested_matchmaker_id?: string;
  paired_suggestion_id?: string;
  created_by_matchmaker_id?: string;
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
  suggester_id: string;
  suggested_profile_id: string;
  suggester_continuation_choice?: 'by_themselves' | 'with_middle_person';
  suggested_continuation_choice?: 'by_themselves' | 'with_middle_person';
  suggester_matchmaker_id?: string;
  suggested_matchmaker_id?: string;
  paired_suggestion_id?: string;
  created_by_matchmaker_id?: string;
  paired_suggestion?: {
    id: string;
    status: 'pending' | 'accepted' | 'rejected' | 'completed';
  };
  suggested_profile?: {
    id: string;
    first_name: string;
    last_name: string;
    pictures?: any;
    picture_privacy?: 'none' | 'always' | 'private';
    privacy_settings?: any;
    email?: string;
    phone?: string;
    whatsapp?: string;
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
    picture_privacy?: 'none' | 'always' | 'private';
    privacy_settings?: any;
    email?: string;
    phone?: string;
    whatsapp?: string;
  };
  suggester_matchmaker?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
  };
  suggested_matchmaker?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
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
   * Check if there's an active suggestion between two profiles
   */
  async hasActiveSuggestion(
    suggesterId: string,
    suggestedProfileId: string
  ): Promise<{ exists: boolean; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('suggestions')
        .select('id, status')
        .eq('suggester_id', suggesterId)
        .eq('suggested_profile_id', suggestedProfileId)
        .in('status', ['pending', 'accepted', 'completed'])
        .limit(1);

      if (error) {
        console.error('Error checking active suggestion:', error);
        return { exists: false, error: error.message };
      }

      return { exists: data && data.length > 0 };
    } catch (error) {
      console.error('Error checking active suggestion:', error);
      return { exists: false, error: 'An unexpected error occurred' };
    }
  }

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

      // Check if there's already an active suggestion
      const { exists, error: checkError } = await this.hasActiveSuggestion(
        userProfile.id,
        suggestedProfileId
      );

      if (checkError) {
        return { success: false, error: 'Failed to check existing suggestions' };
      }

      if (exists) {
        return { 
          success: false, 
          error: 'You already have an active suggestion with this person. Please wait for a response or delete the existing suggestion.' 
        };
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
        return { success: false, error: error.message };
      }

      return { success: true, suggestion: data };
    } catch (error) {
      console.error('Error creating suggestion:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Create a matchmaker-initiated suggestion between two profiles
   * The matchmaker is facilitating the introduction but doesn't necessarily become the middle person
   * Each profile keeps their own existing matchmaker (or none if they don't have one)
   * Both profiles will receive the suggestion
   */
  async createMatchmakerSuggestion(
    profile1Id: string,
    profile2Id: string,
    matchmakerId: string // The matchmaker creating the setup (used for permissions, not assigned as middle person)
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get both profiles to find their matchmakers (for logging/validation)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, matchmaker_id')
        .in('id', [profile1Id, profile2Id]);

      if (profilesError || !profiles || profiles.length !== 2) {
        console.error('Error fetching profiles:', profilesError);
        return { success: false, error: 'Could not find both profiles' };
      }

      const profile1 = profiles.find(p => p.id === profile1Id);
      const profile2 = profiles.find(p => p.id === profile2Id);

      if (!profile1 || !profile2) {
        return { success: false, error: 'Invalid profile IDs' };
      }

      console.log('Creating matchmaker suggestion:', {
        profile1: profile1.first_name,
        profile2: profile2.first_name,
        matchmakerId,
        profile1MatchmakerId: profile1.matchmaker_id,
        profile2MatchmakerId: profile2.matchmaker_id,
      });

      // Call the database function to create both suggestions
      // This bypasses RLS using SECURITY DEFINER
      const { data, error } = await supabase
        .rpc('create_matchmaker_suggestion', {
          profile1_id: profile1Id,
          profile2_id: profile2Id,
          matchmaker_profile_id: matchmakerId,
        });

      if (error) {
        console.error('Error calling create_matchmaker_suggestion:', error);
        return { success: false, error: `Failed to create suggestions: ${error.message}` };
      }

      // Check the result from the function
      if (!data || !data.success) {
        console.error('Function returned error:', data?.error);
        return { success: false, error: data?.error || 'Failed to create suggestions' };
      }

      console.log('Both suggestions created successfully:', data);
      return { success: true };
    } catch (error) {
      console.error('Error in createMatchmakerSuggestion:', error);
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
          suggester_id,
          suggested_profile_id,
          status,
          notes,
          created_at,
          updated_at,
          suggester_continuation_choice,
          suggested_continuation_choice,
          paired_suggestion_id,
          created_by_matchmaker_id,
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
        .is('created_by_matchmaker_id', null) // Only show user-initiated suggestions
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching suggestions with details:', error);
        return { success: false, error: error.message };
      }

      // Fetch paired suggestion statuses separately for self-referencing joins
      const suggestionsWithPaired = await Promise.all(
        (data || []).map(async (suggestion) => {
          if (suggestion.paired_suggestion_id) {
            const { data: pairedData } = await supabase
              .from('suggestions')
              .select('id, status')
              .eq('id', suggestion.paired_suggestion_id)
              .single();
            
            return {
              ...suggestion,
              paired_suggestion: pairedData || undefined
            };
          }
          return suggestion;
        })
      );

      console.log('Fetched suggestions:', suggestionsWithPaired?.length || 0);
      return { success: true, suggestions: suggestionsWithPaired as any };

    } catch (error) {
      console.error('Error fetching suggestions with details:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Check if user already has an active info request to this profile
   */
  async hasActiveInfoRequest(requestedProfileId: string): Promise<{ 
    success: boolean; 
    hasActive: boolean;
    existingRequest?: InfoRequest;
    error?: string 
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { success: false, hasActive: false, error: 'User not authenticated' };
      }

      // Get current user's profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        return { success: false, hasActive: false, error: 'User profile not found' };
      }

      // Check for any active (pending or approved) info request
      const { data, error } = await supabase
        .from('info_requests')
        .select('*')
        .eq('requester_id', userProfile.id)
        .eq('requested_profile_id', requestedProfileId)
        .in('status', ['pending', 'approved'])
        .maybeSingle();

      if (error) {
        console.error('Error checking for active info request:', error);
        return { success: false, hasActive: false, error: error.message };
      }

      return { 
        success: true, 
        hasActive: !!data,
        existingRequest: data || undefined
      };
    } catch (error) {
      console.error('Error in hasActiveInfoRequest:', error);
      return { success: false, hasActive: false, error: 'An unexpected error occurred' };
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

      // Check if an active request already exists
      const checkResult = await this.hasActiveInfoRequest(requestedProfileId);
      if (checkResult.hasActive) {
        const status = checkResult.existingRequest?.status;
        if (status === 'pending') {
          return { success: false, error: 'You already have a pending info request for this profile' };
        } else if (status === 'approved') {
          return { success: false, error: 'Your info request has already been approved. You can view the full profile.' };
        }
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
          suggester_id,
          suggested_profile_id,
          status,
          notes,
          created_at,
          updated_at,
          suggester_continuation_choice,
          suggested_continuation_choice,
          paired_suggestion_id,
          created_by_matchmaker_id,
          suggester_profile:profiles!suggestions_suggester_id_fkey(
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

      // Fetch paired suggestion statuses separately for self-referencing joins
      const suggestionsWithPaired = await Promise.all(
        (data || []).map(async (suggestion) => {
          if (suggestion.paired_suggestion_id) {
            const { data: pairedData } = await supabase
              .from('suggestions')
              .select('id, status')
              .eq('id', suggestion.paired_suggestion_id)
              .single();
            
            return {
              ...suggestion,
              paired_suggestion: pairedData || undefined
            };
          }
          return suggestion;
        })
      );

      console.log('Fetched received suggestions:', suggestionsWithPaired?.length || 0);
      return { success: true, suggestions: suggestionsWithPaired as any };
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

      // Query for suggestions where current user is the matchmaker for either party
      // and the suggestion is accepted or completed
      const { data, error } = await supabase
        .from('suggestions')
        .select(`
          id,
          status,
          notes,
          created_at,
          updated_at,
          suggester_id,
          suggested_profile_id,
          suggester_continuation_choice,
          suggested_continuation_choice,
          suggester_matchmaker_id,
          suggested_matchmaker_id,
          suggester_profile:profiles!suggestions_suggester_id_fkey(
            id,
            first_name,
            last_name,
            pictures,
            picture_privacy,
            privacy_settings,
            email,
            phone,
            whatsapp
          ),
          suggested_profile:profiles!suggestions_suggested_profile_id_fkey(
            id,
            first_name,
            last_name,
            pictures,
            picture_privacy,
            privacy_settings,
            email,
            phone,
            whatsapp
          ),
          suggester_matchmaker:profiles!suggestions_suggester_matchmaker_id_fkey(
            id,
            first_name,
            last_name,
            email,
            phone,
            whatsapp
          ),
          suggested_matchmaker:profiles!suggestions_suggested_matchmaker_id_fkey(
            id,
            first_name,
            last_name,
            email,
            phone,
            whatsapp
          )
        `)
        .or(`suggester_matchmaker_id.eq.${userProfile.id},suggested_matchmaker_id.eq.${userProfile.id}`)
        .in('status', ['accepted', 'completed'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching matchmaker suggestions:', error);
        return { success: false, error: error.message };
      }

      console.log('Fetched matchmaker suggestions:', data?.length || 0);
      
      return { success: true, suggestions: data as any };
    } catch (error) {
      console.error('Error fetching matchmaker suggestions:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Update suggestion status (accept/reject)
   */
  async updateSuggestionStatus(
    suggestionId: string,
    status: 'accepted' | 'rejected'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('suggestions')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', suggestionId);

      if (error) {
        console.error('Error updating suggestion status:', error);
        return { success: false, error: error.message };
      }

      console.log('Successfully updated suggestion status to:', status);
      return { success: true };
    } catch (error) {
      console.error('Error updating suggestion status:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Update continuation choice for a user (suggester or suggested)
   */
  async updateContinuationChoice(
    suggestionId: string,
    userType: 'suggester' | 'suggested',
    choice: 'by_themselves' | 'with_middle_person',
    matchmakerId?: string
  ): Promise<{ success: boolean; error?: string; suggestion?: Suggestion }> {
    try {
      console.log('Updating continuation choice:', { suggestionId, userType, choice, matchmakerId });

      // First, verify the suggestion exists and user has access
      const { data: existingSuggestion, error: checkError } = await supabase
        .from('suggestions')
        .select('*')
        .eq('id', suggestionId)
        .single();

      if (checkError || !existingSuggestion) {
        console.error('Suggestion not found or no access:', checkError);
        return { 
          success: false, 
          error: 'Suggestion not found or you do not have permission to update it' 
        };
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (userType === 'suggester') {
        updateData.suggester_continuation_choice = choice;
        if (choice === 'with_middle_person' && matchmakerId) {
          updateData.suggester_matchmaker_id = matchmakerId;
        }
      } else {
        updateData.suggested_continuation_choice = choice;
        if (choice === 'with_middle_person' && matchmakerId) {
          updateData.suggested_matchmaker_id = matchmakerId;
        }
      }

      console.log('Applying update:', updateData);

      const { data, error } = await supabase
        .from('suggestions')
        .update(updateData)
        .eq('id', suggestionId)
        .select()
        .single();

      if (error) {
        console.error('Error updating continuation choice:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        console.error('Update succeeded but no data returned');
        return { success: false, error: 'Update failed - no data returned' };
      }

      console.log('Update successful, checking if both choices made:', data);

      // Check if both parties have made their choice, then mark as completed
      if (data.suggester_continuation_choice && data.suggested_continuation_choice) {
        console.log('Both parties have chosen, marking as completed');
        await this.updateSuggestionStatus(suggestionId, 'completed' as any);
      }

      console.log('Successfully updated continuation choice');
      return { success: true, suggestion: data };
    } catch (error) {
      console.error('Error updating continuation choice:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get suggestion with full details including contact information
   */
  async getSuggestionWithContactInfo(suggestionId: string): Promise<{
    success: boolean;
    suggestion?: SuggestionWithDetails;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('suggestions')
        .select(`
          *,
          suggester_profile:profiles!suggestions_suggester_id_fkey(
            id,
            first_name,
            last_name,
            pictures,
            email,
            phone,
            whatsapp
          ),
          suggested_profile:profiles!suggestions_suggested_profile_id_fkey(
            id,
            first_name,
            last_name,
            pictures,
            email,
            phone,
            whatsapp
          ),
          suggester_matchmaker:profiles!suggestions_suggester_matchmaker_id_fkey(
            id,
            first_name,
            last_name,
            email,
            phone,
            whatsapp
          ),
          suggested_matchmaker:profiles!suggestions_suggested_matchmaker_id_fkey(
            id,
            first_name,
            last_name,
            email,
            phone,
            whatsapp
          )
        `)
        .eq('id', suggestionId)
        .single();

      if (error) {
        console.error('Error fetching suggestion with contact info:', error);
        return { success: false, error: error.message };
      }

      return { success: true, suggestion: data as any };
    } catch (error) {
      console.error('Error fetching suggestion with contact info:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Delete a suggestion (only if user is the suggester and status is pending)
   */
  async deleteSuggestion(suggestionId: string): Promise<{ success: boolean; error?: string }> {
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

      // First check if the suggestion exists and belongs to the user
      const { data: suggestion, error: fetchError } = await supabase
        .from('suggestions')
        .select('suggester_id, status')
        .eq('id', suggestionId)
        .single();

      if (fetchError) {
        console.error('Error fetching suggestion:', fetchError);
        return { success: false, error: 'Suggestion not found' };
      }

      if (suggestion.suggester_id !== userProfile.id) {
        return { success: false, error: 'You can only delete suggestions you created' };
      }

      if (suggestion.status !== 'pending') {
        return { success: false, error: 'Only pending suggestions can be deleted' };
      }

      // Delete the suggestion
      const { error: deleteError } = await supabase
        .from('suggestions')
        .delete()
        .eq('id', suggestionId);

      if (deleteError) {
        console.error('Error deleting suggestion:', deleteError);
        return { success: false, error: deleteError.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting suggestion:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}

export const suggestionService = new SuggestionService();

