import { notificationService } from './notificationService';
import { supabase } from './supabase';

export interface IntroRequest {
  id: string;
  requester_id: string;
  requested_profile_id: string;
  requester_middle_person_id: string; // The matchmaker
  requested_middle_person_id?: string; // Optional: if requested person chooses their own matchmaker
  
  // Overall status tracking
  status: 'pending_matchmaker' | 'pending_requested' | 'accepted' | 'rejected' | 'completed';
  
  // Step 1: Matchmaker responds to requester
  matchmaker_status: 'pending' | 'accepted' | 'rejected';
  matchmaker_note_to_requester?: string;
  matchmaker_note_to_requested?: string; // Optional note from matchmaker to requested person
  matchmaker_responded_at?: string;
  
  // Step 2: Requested person responds to matchmaker
  requested_status: 'pending' | 'accepted' | 'rejected';
  requested_note_to_matchmaker?: string;
  requested_responded_at?: string;
  requested_note?: string; // Legacy field
  
  // Continuation choices (step 3)
  requester_continuation_choice?: 'by_themselves' | 'with_middle_person';
  requested_continuation_choice?: 'by_themselves' | 'with_middle_person';
  
  created_at: string;
  updated_at: string;
  
  // Joined profile data
  requester_profile?: any;
  requested_profile?: any;
  requester_middle_person?: any;
  requested_middle_person?: any;
}

class IntroService {
  /**
   * NEW FLOW Step 1: Create intro request (goes to matchmaker first)
   * Example: Ori asks for intro to Shimon, selects Ben as matchmaker
   * Ori also specifies how she wants to continue if both accept
   */
  async createIntroRequest(
    requestedProfileId: string,
    matchmakerId: string,
    requesterContinuationChoice?: 'by_themselves' | 'with_middle_person'
  ): Promise<{ success: boolean; error?: string; request?: IntroRequest }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      if (!profile) {
        return { success: false, error: 'Profile not found' };
      }

      // Check for existing active request
      const { data: existing } = await supabase
        .from('intro_requests')
        .select('*')
        .eq('requester_id', profile.id)
        .eq('requested_profile_id', requestedProfileId)
        .in('status', ['pending_matchmaker', 'pending_requested', 'accepted'])
        .single();

      if (existing) {
        return { success: false, error: 'An intro request already exists for this profile' };
      }

      // Create the intro request with new flow
      const insertData: any = {
        requester_id: profile.id,
        requested_profile_id: requestedProfileId,
        requester_middle_person_id: matchmakerId,
        status: 'pending_matchmaker',
        matchmaker_status: 'pending',
        requested_status: 'pending',
      };

      // Add requester's continuation choice if provided
      if (requesterContinuationChoice) {
        insertData.requester_continuation_choice = requesterContinuationChoice;
      }

      const { data, error } = await supabase
        .from('intro_requests')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating intro request:', error);
        return { success: false, error: error.message };
      }

      // Fetch profile information for notifications
      const [requestedProfileResult, matchmakerResult] = await Promise.all([
        supabase.from('profiles').select('user_id, first_name, last_name').eq('id', requestedProfileId).single(),
        supabase.from('profiles').select('user_id, first_name, last_name').eq('id', matchmakerId).single(),
      ]);

      // Notify the matchmaker (NEW: only matchmaker gets notified, not requested person yet)
      if (matchmakerResult.data && requestedProfileResult.data) {
        await notificationService.sendNotification(
          matchmakerResult.data.user_id,
          'New Matchmaking Request',
          `${profile.first_name} ${profile.last_name} is asking for an intro to ${requestedProfileResult.data.first_name} ${requestedProfileResult.data.last_name} and wants you to be the matchmaker`,
          {
            type: 'matchmaker_request',
            requestId: data.id,
            requesterId: profile.id,
            requestedProfileId: requestedProfileId,
          }
        );
      }

      return { success: true, request: data };
    } catch (error: any) {
      console.error('Error in createIntroRequest:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * NEW FLOW Step 2: Matchmaker responds to request
   * Example: Ben accepts/rejects Ori's request with optional notes
   */
  async matchmakerRespondToRequest(
    requestId: string,
    response: 'accepted' | 'rejected',
    noteToRequester?: string,
    noteToRequested?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
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

      // Get the request
      const { data: request } = await supabase
        .from('intro_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!request) {
        return { success: false, error: 'Request not found' };
      }

      // Verify this user is the matchmaker
      if (request.requester_middle_person_id !== profile.id) {
        return { success: false, error: 'You are not the matchmaker for this request' };
      }

      const now = new Date().toISOString();
      const updateData: any = {
        matchmaker_status: response,
        matchmaker_responded_at: now,
        updated_at: now,
      };

      if (noteToRequester) {
        updateData.matchmaker_note_to_requester = noteToRequester;
      }

      if (noteToRequested) {
        updateData.matchmaker_note_to_requested = noteToRequested;
      }

      if (response === 'accepted') {
        // Matchmaker accepted, move to next step: pending_requested
        updateData.status = 'pending_requested';
      } else {
        // Matchmaker rejected, mark overall status as rejected
        updateData.status = 'rejected';
      }

      const { error } = await supabase
        .from('intro_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) {
        console.error('Error updating request:', error);
        return { success: false, error: error.message };
      }

      // Send notifications
      try {
        const [requesterResult, requestedResult] = await Promise.all([
          supabase.from('profiles').select('user_id, first_name, last_name').eq('id', request.requester_id).single(),
          supabase.from('profiles').select('user_id, first_name, last_name').eq('id', request.requested_profile_id).single(),
        ]);

        // Notify requester about matchmaker's response
        if (requesterResult.data) {
          await notificationService.sendNotification(
            requesterResult.data.user_id,
            response === 'accepted' ? 'Matchmaker Accepted!' : 'Matchmaker Declined',
            response === 'accepted'
              ? `Your matchmaker accepted your intro request${noteToRequester ? ': ' + noteToRequester : ''}`
              : `Your matchmaker declined your intro request${noteToRequester ? ': ' + noteToRequester : ''}`,
            {
              type: 'matchmaker_responded',
              requestId: requestId,
              response: response,
            }
          );
        }

        // If accepted, notify the requested person
        if (response === 'accepted' && requestedResult.data && requesterResult.data) {
          await notificationService.sendNotification(
            requestedResult.data.user_id,
            'New Intro Request',
            `${profile.first_name} ${profile.last_name} is facilitating an intro request from ${requesterResult.data.first_name}`,
            {
              type: 'intro_request_from_matchmaker',
              requestId: requestId,
              matchmakerId: profile.id,
            }
          );
        }
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in matchmakerRespondToRequest:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * NEW FLOW Step 3: Requested person responds to matchmaker
   * Example: Shimon accepts/rejects with optional note to Ben
   */
  async requestedPersonRespond(
    requestId: string,
    response: 'accepted' | 'rejected',
    noteToMatchmaker?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
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

      // Get the request
      const { data: request } = await supabase
        .from('intro_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!request) {
        return { success: false, error: 'Request not found' };
      }

      // Verify this user is the requested person
      if (request.requested_profile_id !== profile.id) {
        return { success: false, error: 'This request is not for you' };
      }

      const now = new Date().toISOString();
      const updateData: any = {
        requested_status: response,
        requested_responded_at: now,
        updated_at: now,
      };

      if (noteToMatchmaker) {
        updateData.requested_note_to_matchmaker = noteToMatchmaker;
      }

      if (response === 'accepted') {
        // Both matchmaker and requested accepted, move to accepted status
        updateData.status = 'accepted';
      } else {
        // Requested person rejected, mark overall status as rejected
        updateData.status = 'rejected';
      }

      const { error } = await supabase
        .from('intro_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) {
        console.error('Error updating request:', error);
        return { success: false, error: error.message };
      }

      // Send notifications
      try {
        const [matchmakerResult, requesterResult] = await Promise.all([
          supabase.from('profiles').select('user_id, first_name, last_name').eq('id', request.requester_middle_person_id).single(),
          supabase.from('profiles').select('user_id, first_name, last_name').eq('id', request.requester_id).single(),
        ]);

        // Notify matchmaker about requested person's response
        if (matchmakerResult.data) {
          await notificationService.sendNotification(
            matchmakerResult.data.user_id,
            response === 'accepted' ? 'Match Accepted!' : 'Intro Declined',
            response === 'accepted'
              ? `${profile.first_name} ${profile.last_name} accepted the intro request${noteToMatchmaker ? ': ' + noteToMatchmaker : ''}`
              : `${profile.first_name} ${profile.last_name} declined the intro request${noteToMatchmaker ? ': ' + noteToMatchmaker : ''}`,
            {
              type: 'requested_responded',
              requestId: requestId,
              response: response,
            }
          );
        }

        // If accepted, notify requester too
        if (response === 'accepted' && requesterResult.data) {
          await notificationService.sendNotification(
            requesterResult.data.user_id,
            'Match Accepted!',
            `${profile.first_name} ${profile.last_name} accepted your intro request! Choose how you want to continue.`,
            {
              type: 'match_accepted',
              requestId: requestId,
            }
          );
        }
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in requestedPersonRespond:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set continuation choice for requester or requested person
   * If one party chooses 'with_middle_person', both must continue with matchmaker
   */
  async setContinuationChoice(
    requestId: string,
    choice: 'by_themselves' | 'with_middle_person',
    middlePersonId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
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

      const { data: request } = await supabase
        .from('intro_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!request) {
        return { success: false, error: 'Request not found' };
      }

      const isRequester = request.requester_id === profile.id;
      const isRequested = request.requested_profile_id === profile.id;

      if (!isRequester && !isRequested) {
        return { success: false, error: 'You are not part of this request' };
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (isRequester) {
        updateData.requester_continuation_choice = choice;
        
        // If requester chooses with_middle_person, set it for both
        if (choice === 'with_middle_person') {
          updateData.requested_continuation_choice = 'with_middle_person';
          if (middlePersonId) {
            updateData.requested_middle_person_id = middlePersonId;
          }
        }
      } else {
        updateData.requested_continuation_choice = choice;
        if (middlePersonId) {
          updateData.requested_middle_person_id = middlePersonId;
        }
        
        // If requested chooses with_middle_person, set it for both
        if (choice === 'with_middle_person') {
          updateData.requester_continuation_choice = 'with_middle_person';
        }
      }

      // Check if both have made their continuation choices
      const requesterChoice = isRequester ? choice : request.requester_continuation_choice;
      const requestedChoice = isRequested ? choice : request.requested_continuation_choice;

      if (requesterChoice && requestedChoice) {
        updateData.status = 'completed';
      }

      const { error } = await supabase
        .from('intro_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) {
        console.error('Error setting continuation choice:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in setContinuationChoice:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all intro requests for the current user (sent and received)
   */
  async getMyIntroRequests(): Promise<{
    success: boolean;
    error?: string;
    sentRequests?: IntroRequest[];
    receivedRequests?: IntroRequest[];
  }> {
    try {
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

      const [sentQuery, receivedQuery] = await Promise.all([
        supabase
          .from('intro_requests')
          .select(`
            *,
            requester_profile:profiles!intro_requests_requester_id_fkey(id, first_name, last_name, dob, pictures, gender, phone, email, whatsapp, resume_url),
            requested_profile:profiles!intro_requests_requested_profile_id_fkey(id, first_name, last_name, dob, pictures, gender, phone, email, whatsapp, resume_url),
            requester_middle_person:profiles!intro_requests_requester_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp),
            requested_middle_person:profiles!intro_requests_requested_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp)
          `)
          .eq('requester_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('intro_requests')
          .select(`
            *,
            requester_profile:profiles!intro_requests_requester_id_fkey(id, first_name, last_name, dob, pictures, gender, phone, email, whatsapp, resume_url),
            requested_profile:profiles!intro_requests_requested_profile_id_fkey(id, first_name, last_name, dob, pictures, gender, phone, email, whatsapp, resume_url),
            requester_middle_person:profiles!intro_requests_requester_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp),
            requested_middle_person:profiles!intro_requests_requested_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp)
          `)
          .eq('requested_profile_id', profile.id)
          // Only show to requested person after matchmaker has accepted
          .in('status', ['pending_requested', 'accepted', 'rejected', 'completed'])
          .order('created_at', { ascending: false }),
      ]);

      if (sentQuery.error || receivedQuery.error) {
        console.error('Error fetching intro requests:', sentQuery.error || receivedQuery.error);
        return { success: false, error: (sentQuery.error || receivedQuery.error)?.message };
      }

      return {
        success: true,
        sentRequests: sentQuery.data || [],
        receivedRequests: receivedQuery.data || [],
      };
    } catch (error: any) {
      console.error('Error in getMyIntroRequests:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get requests where current user is the matchmaker
   */
  async getMatchmakerRequests(): Promise<{
    success: boolean;
    error?: string;
    matchmakerRequests?: IntroRequest[];
  }> {
    try {
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

      const { data, error } = await supabase
        .from('intro_requests')
        .select(`
          *,
          requester_profile:profiles!intro_requests_requester_id_fkey(id, first_name, last_name, dob, pictures, gender, phone, email, whatsapp),
          requested_profile:profiles!intro_requests_requested_profile_id_fkey(id, first_name, last_name, dob, pictures, gender, phone, email, whatsapp, resume_url),
          requester_middle_person:profiles!intro_requests_requester_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp),
          requested_middle_person:profiles!intro_requests_requested_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp)
        `)
        .eq('requester_middle_person_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching matchmaker requests:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        matchmakerRequests: data || [],
      };
    } catch (error: any) {
      console.error('Error in getMatchmakerRequests:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Legacy method - kept for backward compatibility but now just calls getMatchmakerRequests
   */
  async getMiddlePersonRequests(): Promise<{
    success: boolean;
    error?: string;
    middlePersonRequests?: IntroRequest[];
  }> {
    const result = await this.getMatchmakerRequests();
    return {
      ...result,
      middlePersonRequests: result.matchmakerRequests,
    };
  }
}

export const introService = new IntroService();
