import { supabase } from './supabase';

export interface IntroRequest {
  id: string;
  requester_id: string;
  requested_profile_id: string;
  requester_middle_person_id: string;
  requested_middle_person_id?: string;
  requester_continuation_choice?: 'by_themselves' | 'with_middle_person';
  requested_continuation_choice?: 'by_themselves' | 'with_middle_person';
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  requested_note?: string;
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
   * Create a new intro request
   */
  async createIntroRequest(
    requestedProfileId: string,
    requesterMiddlePersonId: string
  ): Promise<{ success: boolean; error?: string; request?: IntroRequest }> {
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

      // Check if there's already an active intro request
      const { data: existing } = await supabase
        .from('intro_requests')
        .select('*')
        .eq('requester_id', profile.id)
        .eq('requested_profile_id', requestedProfileId)
        .in('status', ['pending', 'accepted'])
        .single();

      if (existing) {
        return { success: false, error: 'An intro request already exists for this profile' };
      }

      // Create the intro request
      const { data, error } = await supabase
        .from('intro_requests')
        .insert({
          requester_id: profile.id,
          requested_profile_id: requestedProfileId,
          requester_middle_person_id: requesterMiddlePersonId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating intro request:', error);
        return { success: false, error: error.message };
      }

      return { success: true, request: data };
    } catch (error: any) {
      console.error('Error in createIntroRequest:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Respond to an intro request (accept/reject)
   */
  async respondToIntroRequest(
    requestId: string,
    response: 'accepted' | 'rejected',
    note?: string,
    continuationChoice?: 'by_themselves' | 'with_middle_person',
    middlePersonId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        status: response,
        updated_at: new Date().toISOString(),
      };

      if (note) {
        updateData.requested_note = note;
      }

      // If responding person is choosing continuation and middle person
      if (continuationChoice) {
        updateData.requested_continuation_choice = continuationChoice;
      }

      if (middlePersonId) {
        updateData.requested_middle_person_id = middlePersonId;
      }

      const { error } = await supabase
        .from('intro_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) {
        console.error('Error responding to intro request:', error);
        return { success: false, error: error.message };
      }

      // Check if both have chosen continuation - if so, mark as completed
      if (response === 'accepted' && continuationChoice) {
        const { data: request } = await supabase
          .from('intro_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (
          request &&
          request.requester_continuation_choice &&
          request.requested_continuation_choice
        ) {
          await supabase
            .from('intro_requests')
            .update({ status: 'completed' })
            .eq('id', requestId);
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in respondToIntroRequest:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set requested person's middle person choice
   */
  async setRequestedMiddlePerson(
    requestId: string,
    middlePersonId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('intro_requests')
        .update({
          requested_middle_person_id: middlePersonId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error setting requested middle person:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in setRequestedMiddlePerson:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set continuation choice (by_themselves or with_middle_person)
   */
  async setContinuationChoice(
    requestId: string,
    choice: 'by_themselves' | 'with_middle_person',
    isRequester: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const field = isRequester
        ? 'requester_continuation_choice'
        : 'requested_continuation_choice';

      const { error } = await supabase
        .from('intro_requests')
        .update({
          [field]: choice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error setting continuation choice:', error);
        return { success: false, error: error.message };
      }

      // Check if both have chosen - if so, mark as completed
      const { data: request } = await supabase
        .from('intro_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (
        request &&
        request.requester_continuation_choice &&
        request.requested_continuation_choice
      ) {
        await supabase
          .from('intro_requests')
          .update({ status: 'completed' })
          .eq('id', requestId);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in setContinuationChoice:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get intro requests for current user
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

      // Get requests where I'm the requester
      const { data: sentRequests, error: sentError } = await supabase
        .from('intro_requests')
        .select(`
          *,
          requester_profile:profiles!intro_requests_requester_id_fkey(id, first_name, last_name, age, pictures, gender),
          requested_profile:profiles!intro_requests_requested_profile_id_fkey(id, first_name, last_name, age, pictures, gender, phone, email, whatsapp),
          requester_middle_person:profiles!intro_requests_requester_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp),
          requested_middle_person:profiles!intro_requests_requested_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp)
        `)
        .eq('requester_id', profile.id)
        .order('created_at', { ascending: false });

      // Get requests where I'm the requested person
      const { data: receivedRequests, error: receivedError } = await supabase
        .from('intro_requests')
        .select(`
          *,
          requester_profile:profiles!intro_requests_requester_id_fkey(id, first_name, last_name, age, pictures, gender, phone, email, whatsapp),
          requested_profile:profiles!intro_requests_requested_profile_id_fkey(id, first_name, last_name, age, pictures, gender),
          requester_middle_person:profiles!intro_requests_requester_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp),
          requested_middle_person:profiles!intro_requests_requested_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp)
        `)
        .eq('requested_profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (sentError || receivedError) {
        console.error('Error fetching intro requests:', sentError || receivedError);
        return { success: false, error: (sentError || receivedError)?.message };
      }

      return {
        success: true,
        sentRequests: sentRequests || [],
        receivedRequests: receivedRequests || [],
      };
    } catch (error: any) {
      console.error('Error in getMyIntroRequests:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get intro requests where current user is the middle person
   */
  async getMiddlePersonRequests(): Promise<{
    success: boolean;
    error?: string;
    middlePersonRequests?: IntroRequest[];
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

      // Get requests where I'm the middle person (either requester's or requested's middle person)
      const { data: requests, error } = await supabase
        .from('intro_requests')
        .select(`
          *,
          requester_profile:profiles!intro_requests_requester_id_fkey(id, first_name, last_name, age, pictures, gender, phone, email, whatsapp),
          requested_profile:profiles!intro_requests_requested_profile_id_fkey(id, first_name, last_name, age, pictures, gender, phone, email, whatsapp),
          requester_middle_person:profiles!intro_requests_requester_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp),
          requested_middle_person:profiles!intro_requests_requested_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp)
        `)
        .or(`requester_middle_person_id.eq.${profile.id},requested_middle_person_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching middle person requests:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        middlePersonRequests: requests || [],
      };
    } catch (error: any) {
      console.error('Error in getMiddlePersonRequests:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get contact information for middle person based on continuation choices
   */
  getMiddlePersonContactInfo(request: IntroRequest, middlePersonId: string): {
    shouldShowContact: boolean;
    contactPerson?: {
      name: string;
      phone?: string;
      email?: string;
      whatsapp?: string;
    };
    message: string;
  } {
    // Both must have made their choices
    if (!request.requester_continuation_choice || !request.requested_continuation_choice) {
      return {
        shouldShowContact: false,
        message: 'Waiting for both parties to choose how to continue...',
      };
    }

    const isRequesterMiddlePerson = request.requester_middle_person_id === middlePersonId;
    const isRequestedMiddlePerson = request.requested_middle_person_id === middlePersonId;
    
    const requesterByThemselves = request.requester_continuation_choice === 'by_themselves';
    const requestedByThemselves = request.requested_continuation_choice === 'by_themselves';

    // Both chose by_themselves - middle person doesn't need to do anything
    if (requesterByThemselves && requestedByThemselves) {
      return {
        shouldShowContact: false,
        message: 'Both parties chose to continue directly with each other.',
      };
    }

    // If I'm the requester's middle person and requester chose me but requested chose by_themselves
    // I need the requested person's contact info
    if (isRequesterMiddlePerson && !requesterByThemselves && requestedByThemselves) {
      const contactProfile = request.requested_profile;
      return {
        shouldShowContact: true,
        contactPerson: {
          name: `${contactProfile.first_name} ${contactProfile.last_name}`,
          phone: contactProfile.phone,
          email: contactProfile.email,
          whatsapp: contactProfile.whatsapp,
        },
        message: `${contactProfile.first_name} chose to continue directly. Contact info:`,
      };
    }

    // If I'm the requested person's middle person and requested chose me but requester chose by_themselves
    // I need the requester's contact info
    if (isRequestedMiddlePerson && requesterByThemselves && !requestedByThemselves) {
      const contactProfile = request.requester_profile;
      return {
        shouldShowContact: true,
        contactPerson: {
          name: `${contactProfile.first_name} ${contactProfile.last_name}`,
          phone: contactProfile.phone,
          email: contactProfile.email,
          whatsapp: contactProfile.whatsapp,
        },
        message: `${contactProfile.first_name} chose to continue directly. Contact info:`,
      };
    }

    // Both chose middle persons
    if (!requesterByThemselves && !requestedByThemselves) {
      // I need to contact the other side's middle person
      if (isRequesterMiddlePerson) {
        const otherMiddlePerson = request.requested_middle_person;
        return {
          shouldShowContact: true,
          contactPerson: {
            name: `${otherMiddlePerson.first_name} ${otherMiddlePerson.last_name}`,
            phone: otherMiddlePerson.phone,
            email: otherMiddlePerson.email,
            whatsapp: otherMiddlePerson.whatsapp,
          },
          message: `Contact the other middle person ${otherMiddlePerson.first_name}:`,
        };
      } else if (isRequestedMiddlePerson) {
        const otherMiddlePerson = request.requester_middle_person;
        return {
          shouldShowContact: true,
          contactPerson: {
            name: `${otherMiddlePerson.first_name} ${otherMiddlePerson.last_name}`,
            phone: otherMiddlePerson.phone,
            email: otherMiddlePerson.email,
            whatsapp: otherMiddlePerson.whatsapp,
          },
          message: `Contact the other middle person ${otherMiddlePerson.first_name}:`,
        };
      }
    }

    // Default case
    return {
      shouldShowContact: false,
      message: 'Waiting for continuation choices...',
    };
  }

  /**
   * Get contact information based on continuation choices
   */
  getContactInfo(request: IntroRequest, isRequester: boolean): {
    shouldShowContact: boolean;
    contactPerson?: {
      name: string;
      phone?: string;
      email?: string;
      whatsapp?: string;
    };
    message: string;
  } {
    // Both must have made their choices
    if (!request.requester_continuation_choice || !request.requested_continuation_choice) {
      return {
        shouldShowContact: false,
        message: 'Waiting for both parties to choose how to continue...',
      };
    }

    const requesterByThemselves = request.requester_continuation_choice === 'by_themselves';
    const requestedByThemselves = request.requested_continuation_choice === 'by_themselves';

    // Both chose by_themselves - share direct contact
    if (requesterByThemselves && requestedByThemselves) {
      const contactProfile = isRequester ? request.requested_profile : request.requester_profile;
      return {
        shouldShowContact: true,
        contactPerson: {
          name: `${contactProfile.first_name} ${contactProfile.last_name}`,
          phone: contactProfile.phone,
          email: contactProfile.email,
          whatsapp: contactProfile.whatsapp,
        },
        message: 'Both chose to continue directly. Contact info below:',
      };
    }

    // One chose middle person, one chose by_themselves
    if (requesterByThemselves && !requestedByThemselves) {
      // Both parties get requested's middle person contact
      // (The middle person will separately receive the contact of the person who chose by_themselves)
      const middlePerson = request.requested_middle_person;
      return {
        shouldShowContact: true,
        contactPerson: {
          name: `${middlePerson.first_name} ${middlePerson.last_name}`,
          phone: middlePerson.phone,
          email: middlePerson.email,
          whatsapp: middlePerson.whatsapp,
        },
        message: isRequester 
          ? `Contact ${middlePerson.first_name} (their middle person):`
          : `Contact ${middlePerson.first_name} (your middle person):`,
      };
    }

    if (!requesterByThemselves && requestedByThemselves) {
      // Both parties get requester's middle person contact
      // (The middle person will separately receive the contact of the person who chose by_themselves)
      const middlePerson = request.requester_middle_person;
      return {
        shouldShowContact: true,
        contactPerson: {
          name: `${middlePerson.first_name} ${middlePerson.last_name}`,
          phone: middlePerson.phone,
          email: middlePerson.email,
          whatsapp: middlePerson.whatsapp,
        },
        message: isRequester 
          ? `Contact ${middlePerson.first_name} (your middle person):`
          : `Contact ${middlePerson.first_name} (their middle person):`,
      };
    }

    // Both chose middle person
    const middlePerson = isRequester 
      ? request.requester_middle_person 
      : request.requested_middle_person;
    
    return {
      shouldShowContact: true,
      contactPerson: {
        name: `${middlePerson.first_name} ${middlePerson.last_name}`,
        phone: middlePerson.phone,
        email: middlePerson.email,
        whatsapp: middlePerson.whatsapp,
      },
      message: `Contact your middle person ${middlePerson.first_name}:`,
    };
  }
}

export const introService = new IntroService();

