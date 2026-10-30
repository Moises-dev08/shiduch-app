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

      // Fire-and-forget: notify the matchmaker without blocking the caller
      if (matchmakerResult.data && requestedProfileResult.data) {
        const _m = matchmakerResult.data;
        const _r = requestedProfileResult.data;
        const _requestId = data.id;
        notificationService.sendNotification(
          _m.user_id,
          'New Matchmaking Request',
          `${profile.first_name} ${profile.last_name} is asking for an intro to ${_r.first_name} ${_r.last_name} and wants you to be the matchmaker`,
          {
            type: 'matchmaker_request',
            requestId: _requestId,
            requesterId: profile.id,
            requestedProfileId: requestedProfileId,
          }
        ).catch((e) => console.error('Error sending matchmaker_request notification:', e));
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
        .select('id, first_name, last_name')
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

      // Fire-and-forget notifications
      const _requestId = requestId;
      const _response = response;
      const _matchmakerId = profile.id;
      const _matchmakerName = profile.first_name;
      const _noteToRequester = noteToRequester;
      ;(async () => {
        const [requesterResult, requestedResult] = await Promise.all([
          supabase.from('profiles').select('user_id, first_name, last_name').eq('id', request.requester_id).single(),
          supabase.from('profiles').select('user_id, first_name, last_name').eq('id', request.requested_profile_id).single(),
        ]);
        await Promise.allSettled([
          requesterResult.data
            ? notificationService.sendNotification(
                requesterResult.data.user_id,
                _response === 'accepted' ? 'Matchmaker Accepted!' : 'Matchmaker Declined',
                _response === 'accepted'
                  ? `Your matchmaker accepted your intro request${_noteToRequester ? ': ' + _noteToRequester : ''}`
                  : `Your matchmaker declined your intro request${_noteToRequester ? ': ' + _noteToRequester : ''}`,
                { type: 'matchmaker_responded', requestId: _requestId, response: _response }
              )
            : Promise.resolve(),
          _response === 'accepted' && requestedResult.data && requesterResult.data
            ? notificationService.sendNotification(
                requestedResult.data.user_id,
                'New Intro Request',
                `${_matchmakerName} is facilitating an intro. ${requesterResult.data.first_name} already said yes and asked to be matched with you.`,
                { type: 'intro_request_from_matchmaker', requestId: _requestId, matchmakerId: _matchmakerId }
              )
            : Promise.resolve(),
        ]);
      })().catch((e) => console.error('Error sending matchmakerRespondToRequest notifications:', e));

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
        .select('id, first_name, last_name')
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

      // Fire-and-forget notifications
      const _rqId = requestId;
      const _resp = response;
      const _profileName = `${profile.first_name} ${profile.last_name}`;
      const _noteToMM = noteToMatchmaker;
      const _accepterUserId = user.id;
      ;(async () => {
        const [matchmakerResult, requesterResult] = await Promise.all([
          supabase.from('profiles').select('user_id, first_name, last_name').eq('id', request.requester_middle_person_id).single(),
          supabase.from('profiles').select('user_id, first_name, last_name').eq('id', request.requester_id).single(),
        ]);
        await Promise.allSettled([
          matchmakerResult.data
            ? notificationService.sendNotification(
                matchmakerResult.data.user_id,
                _resp === 'accepted' ? 'Both sides said yes' : 'Intro declined',
                _resp === 'accepted'
                  ? `${_profileName} said yes. Both sides have agreed to the intro.`
                  : `${_profileName} declined the intro request${_noteToMM ? ': ' + _noteToMM : ''}`,
                {
                  type: _resp === 'accepted' ? 'intro_both_accepted' : 'requested_responded',
                  requestId: _rqId,
                  response: _resp,
                }
              )
            : Promise.resolve(),
          _resp === 'accepted' && requesterResult.data
            ? notificationService.sendNotification(
                requesterResult.data.user_id,
                'Both sides said yes',
                `${_profileName} said yes. Both sides have agreed to the intro. Choose how you want to continue.`,
                { type: 'match_accepted', requestId: _rqId }
              )
            : Promise.resolve(),
          _resp === 'rejected' && requesterResult.data
            ? notificationService.sendNotification(
                requesterResult.data.user_id,
                'A match was declined',
                `${_profileName} declined the intro request.`,
                { type: 'intro_declined', requestId: _rqId }
              )
            : Promise.resolve(),
          _resp === 'accepted'
            ? notificationService.sendNotification(
                _accepterUserId,
                'Both sides said yes',
                'Both sides have agreed to the intro. Open Connect to choose how you want to continue.',
                { type: 'match_accepted', requestId: _rqId }
              )
            : Promise.resolve(),
        ]);
      })().catch((e) => console.error('Error sending requestedPersonRespond notifications:', e));

      return { success: true };
    } catch (error: any) {
      console.error('Error in requestedPersonRespond:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Atomic: accept intro request AND set continuation choice in a single DB write.
   * Prevents the intermediate state (accepted but no continuation choice) that would
   * briefly show the "Choose How to Continue" button via a Realtime-triggered refetch.
   */
  async acceptWithContinuation(
    requestId: string,
    choice: 'by_themselves' | 'with_middle_person',
    matchmakerId?: string,
    noteToMatchmaker?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { success: false, error: 'Not authenticated' };

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      if (!profile) return { success: false, error: 'Profile not found' };

      const { data: request } = await supabase
        .from('intro_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (!request) return { success: false, error: 'Request not found' };
      if (request.requested_profile_id !== profile.id) {
        return { success: false, error: 'This request is not for you' };
      }

      const now = new Date().toISOString();
      const updateData: any = {
        requested_status: 'accepted',
        requested_responded_at: now,
        status: 'accepted',
        requested_continuation_choice: choice,
        updated_at: now,
      };

      if (noteToMatchmaker) updateData.requested_note_to_matchmaker = noteToMatchmaker;

      // If either party wants a matchmaker, both use the matchmaker
      if (choice === 'with_middle_person') {
        if (matchmakerId) updateData.requested_middle_person_id = matchmakerId;
        updateData.requester_continuation_choice = 'with_middle_person';
      }

      // If requester already chose with_middle_person, honour that
      if (request.requester_continuation_choice === 'with_middle_person') {
        updateData.requested_continuation_choice = 'with_middle_person';
        if (matchmakerId) updateData.requested_middle_person_id = matchmakerId;
      }

      // Check if both choices are now set → move to completed
      const finalRequestedChoice = updateData.requested_continuation_choice;
      const finalRequesterChoice = updateData.requester_continuation_choice ?? request.requester_continuation_choice;
      if (finalRequestedChoice && finalRequesterChoice) {
        updateData.status = 'completed';
      }

      const { error } = await supabase
        .from('intro_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) return { success: false, error: error.message };

      // Fire-and-forget notifications
      const _awcReqId = requestId;
      const _awcName = `${profile.first_name} ${profile.last_name}`;
      const _awcAccepterUserId = user.id;
      ;(async () => {
        const [matchmakerResult, requesterResult] = await Promise.all([
          supabase.from('profiles').select('user_id, first_name, last_name').eq('id', request.requester_middle_person_id).single(),
          supabase.from('profiles').select('user_id, first_name, last_name').eq('id', request.requester_id).single(),
        ]);
        await Promise.allSettled([
          matchmakerResult.data
            ? notificationService.sendNotification(
                matchmakerResult.data.user_id,
                'Both sides said yes',
                `${_awcName} said yes. Both sides have agreed to the intro.`,
                { type: 'intro_both_accepted', requestId: _awcReqId, response: 'accepted' }
              )
            : Promise.resolve(),
          requesterResult.data
            ? notificationService.sendNotification(
                requesterResult.data.user_id,
                'Both sides said yes',
                `${_awcName} said yes. Both sides have agreed to the intro. Choose how you want to continue.`,
                { type: 'match_accepted', requestId: _awcReqId }
              )
            : Promise.resolve(),
          notificationService.sendNotification(
            _awcAccepterUserId,
            'Both sides said yes',
            'Both sides have agreed to the intro. Open Connect to choose how you want to continue.',
            { type: 'match_accepted', requestId: _awcReqId }
          ),
        ]);
      })().catch((e) => console.error('Error sending acceptWithContinuation notifications:', e));

      return { success: true };
    } catch (error: any) {
      console.error('Error in acceptWithContinuation:', error);
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

      // Fire-and-forget: notify parties when a matchmaker is selected for continuation
      if (choice === 'with_middle_person' && middlePersonId) {
        const _sccReqId = requestId;
        const _sccMpId = middlePersonId;
        const _isRequester = isRequester;
        ;(async () => {
          const [requesterResult, requestedResult, matchmakerResult] = await Promise.all([
            supabase.from('profiles').select('id, user_id, first_name, last_name').eq('id', request.requester_id).single(),
            supabase.from('profiles').select('id, user_id, first_name, last_name').eq('id', request.requested_profile_id).single(),
            supabase.from('profiles').select('id, user_id, first_name, last_name').eq('id', _sccMpId).single(),
          ]);
          const requester = requesterResult.data;
          const requested = requestedResult.data;
          const matchmaker = matchmakerResult.data;
          const otherSingle = _isRequester ? requested : requester;
          await Promise.allSettled([
            matchmaker?.user_id
              ? notificationService.sendNotification(
                  matchmaker.user_id,
                  "You've been selected as a matchmaker",
                  `You have been selected to facilitate the match between ${requester?.first_name ?? ''} ${requester?.last_name ?? ''} and ${requested?.first_name ?? ''} ${requested?.last_name ?? ''}.`,
                  { type: 'matchmaker_selected', purpose: 'facilitator_chosen', requestId: _sccReqId, requesterId: requester?.id, requestedProfileId: requested?.id }
                )
              : Promise.resolve(),
            otherSingle?.user_id
              ? notificationService.sendNotification(
                  otherSingle.user_id,
                  'Match will proceed through a matchmaker',
                  `Your match will proceed through matchmaker ${matchmaker?.first_name ?? ''} ${matchmaker?.last_name ?? ''}.`,
                  { type: 'matchmaker_selected', purpose: 'counterpart_notice', requestId: _sccReqId }
                )
              : Promise.resolve(),
          ]);
        })().catch((e) => console.error('Error sending matchmaker_selected notifications (intro):', e));
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
            requester_profile:profiles!intro_requests_requester_id_fkey(id, first_name, last_name, dob, pictures, picture_privacy, gender, phone, email, whatsapp, resume_url),
            requested_profile:profiles!intro_requests_requested_profile_id_fkey(id, first_name, last_name, dob, pictures, picture_privacy, gender, phone, email, whatsapp, resume_url),
            requester_middle_person:profiles!intro_requests_requester_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp),
            requested_middle_person:profiles!intro_requests_requested_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp)
          `)
          .eq('requester_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('intro_requests')
          .select(`
            *,
            requester_profile:profiles!intro_requests_requester_id_fkey(id, first_name, last_name, dob, pictures, picture_privacy, gender, phone, email, whatsapp, resume_url),
            requested_profile:profiles!intro_requests_requested_profile_id_fkey(id, first_name, last_name, dob, pictures, picture_privacy, gender, phone, email, whatsapp, resume_url),
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
          requester_profile:profiles!intro_requests_requester_id_fkey(id, first_name, last_name, dob, pictures, picture_privacy, gender, phone, email, whatsapp),
          requested_profile:profiles!intro_requests_requested_profile_id_fkey(id, first_name, last_name, dob, pictures, picture_privacy, gender, phone, email, whatsapp, resume_url),
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

  getMiddlePersonContactInfo(
    request: IntroRequest,
    currentUserProfileId: string,
  ): {
    shouldShowContact: boolean;
    message: string;
    contactPerson?: { name: string; phone?: string; email?: string; whatsapp?: string };
  } {
    const isActive = request.status === 'accepted' || request.status === 'completed';
    const isRequesterSide = request.requester_middle_person_id === currentUserProfileId;
    const isRequestedSide = request.requested_middle_person_id === currentUserProfileId;

    if (!isActive) {
      return {
        shouldShowContact: false,
        message:
          request.matchmaker_status === 'pending'
            ? 'Waiting for your response'
            : 'Waiting for the other party to respond',
      };
    }

    const buildContact = (profile: any) => ({
      name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim(),
      phone: profile.phone,
      email: profile.email,
      whatsapp: profile.whatsapp,
    });

    if (isRequesterSide) {
      const contactProfile =
        request.requested_middle_person ?? request.requested_profile;
      if (!contactProfile) {
        return { shouldShowContact: false, message: 'Contact info not available' };
      }
      return {
        shouldShowContact: true,
        message: request.requested_middle_person
          ? "Contact the other matchmaker"
          : "Contact the requested person",
        contactPerson: buildContact(contactProfile),
      };
    }

    if (isRequestedSide) {
      const contactProfile =
        request.requester_middle_person ?? request.requester_profile;
      if (!contactProfile) {
        return { shouldShowContact: false, message: 'Contact info not available' };
      }
      return {
        shouldShowContact: true,
        message: request.requester_middle_person
          ? "Contact the requester's matchmaker"
          : "Contact the requester",
        contactPerson: buildContact(contactProfile),
      };
    }

    return { shouldShowContact: false, message: 'Contact info not available' };
  }
}

export const introService = new IntroService();
