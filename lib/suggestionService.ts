import { Profile } from '../types/homeTypes';
import { notificationService } from './notificationService';
import { supabase } from './supabase';

export interface Suggestion {
  id: string;
  suggester_id: string;
  profile_one_id: string;
  profile_two_id: string;
  note?: string; // Legacy field - kept for backward compatibility
  profile_one_note?: string; // Note specifically for profile_one
  profile_two_note?: string; // Note specifically for profile_two
  profile_one_status: 'pending' | 'accepted' | 'rejected';
  profile_two_status: 'pending' | 'accepted' | 'rejected';
  profile_one_continuation_choice?: 'by_themselves' | 'with_middle_person';
  profile_two_continuation_choice?: 'by_themselves' | 'with_middle_person';
  profile_one_middle_person_id?: string;
  profile_two_middle_person_id?: string;
  profile_one_rejection_note?: string;
  profile_two_rejection_note?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  created_at: string;
  updated_at: string;
  // Joined profiles
  suggester_profile?: Profile;
  profile_one?: Profile;
  profile_two?: Profile;
  profile_one_middle_person?: Profile;
  profile_two_middle_person?: Profile;
}

class SuggestionService {
  /**
   * Check if two profiles were suggested before
   */
  async checkPreviousSuggestion(
    profileOneId: string,
    profileTwoId: string
  ): Promise<{ 
    success: boolean; 
    error?: string; 
    hasPrevious: boolean;
    previousSuggestion?: {
      id: string;
      profileOneStatus: 'pending' | 'accepted' | 'rejected';
      profileTwoStatus: 'pending' | 'accepted' | 'rejected';
      profileOneName: string;
      profileTwoName: string;
      createdAt: string;
    };
  }> {
    try {
      // Check for any previous suggestion (in either direction)
      const { data, error } = await supabase
        .from('suggestions')
        .select(`
          id,
          profile_one_status,
          profile_two_status,
          created_at,
          profile_one:profiles!suggestions_profile_one_id_fkey(first_name, last_name),
          profile_two:profiles!suggestions_profile_two_id_fkey(first_name, last_name)
        `)
        .or(`and(profile_one_id.eq.${profileOneId},profile_two_id.eq.${profileTwoId}),and(profile_one_id.eq.${profileTwoId},profile_two_id.eq.${profileOneId})`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking previous suggestion:', error);
        return { success: false, error: error.message, hasPrevious: false };
      }

      if (!data || data.length === 0) {
        return { success: true, hasPrevious: false };
      }

      const prev = data[0] as any;
      
      return {
        success: true,
        hasPrevious: true,
        previousSuggestion: {
          id: prev.id,
          profileOneStatus: prev.profile_one_status,
          profileTwoStatus: prev.profile_two_status,
          profileOneName: `${prev.profile_one.first_name} ${prev.profile_one.last_name}`,
          profileTwoName: `${prev.profile_two.first_name} ${prev.profile_two.last_name}`,
          createdAt: prev.created_at,
        },
      };
    } catch (error: any) {
      console.error('Error in checkPreviousSuggestion:', error);
      return { success: false, error: error.message, hasPrevious: false };
    }
  }

  /**
   * Create a new match suggestion
   */
  async createSuggestion(
    profileOneId: string,
    profileTwoId: string,
    note?: string, // Legacy: single note for both
    profileOneNote?: string, // Note for profile_one
    profileTwoNote?: string // Note for profile_two
  ): Promise<{ success: boolean; error?: string; suggestion?: Suggestion }> {
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

      // Validate that the suggester is not one of the profiles being suggested
      if (profile.id === profileOneId || profile.id === profileTwoId) {
        return { success: false, error: 'You cannot suggest yourself' };
      }

      // Create the suggestion
      // If separate notes are provided, use them; otherwise fall back to single note
      const insertData: any = {
        suggester_id: profile.id,
        profile_one_id: profileOneId,
        profile_two_id: profileTwoId,
      };

      if (profileOneNote !== undefined || profileTwoNote !== undefined) {
        // Use separate notes
        insertData.profile_one_note = profileOneNote?.trim() || null;
        insertData.profile_two_note = profileTwoNote?.trim() || null;
        // Also set legacy note field for backward compatibility (use first non-empty note)
        insertData.note = profileOneNote?.trim() || profileTwoNote?.trim() || note?.trim() || null;
      } else {
        // Use legacy single note
        insertData.note = note?.trim() || null;
        insertData.profile_one_note = null;
        insertData.profile_two_note = null;
      }

      const { data, error } = await supabase
        .from('suggestions')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating suggestion:', error);
        return { success: false, error: error.message };
      }

      // Send push notifications to both suggested profiles
      try {
        // Get profile information for notifications
        const { data: profileOne } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .eq('id', profileOneId)
          .single();

        const { data: profileTwo } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .eq('id', profileTwoId)
          .single();

        const { data: suggesterProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', profile.id)
          .single();

        // Notify profile one
        if (profileOne && suggesterProfile && profileTwo) {
          await notificationService.sendNotification(
            profileOne.user_id,
            'New Match Suggestion',
            `${suggesterProfile.first_name} ${suggesterProfile.last_name} suggested a match with ${profileTwo.first_name} ${profileTwo.last_name}`,
            {
              type: 'suggestion',
              suggestionId: data.id,
              suggesterId: profile.id,
            }
          );
        }

        // Notify profile two
        if (profileTwo && suggesterProfile && profileOne) {
          await notificationService.sendNotification(
            profileTwo.user_id,
            'New Match Suggestion',
            `${suggesterProfile.first_name} ${suggesterProfile.last_name} suggested a match with ${profileOne.first_name} ${profileOne.last_name}`,
            {
              type: 'suggestion',
              suggestionId: data.id,
              suggesterId: profile.id,
            }
          );
        }
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
        // Don't fail the request if notification fails
      }

      return { success: true, suggestion: data };
    } catch (error: any) {
      console.error('Error in createSuggestion:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Respond to a suggestion (accept/reject)
   */
  async respondToSuggestion(
    suggestionId: string,
    response: 'accepted' | 'rejected',
    rejectionNote?: string
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

      // Get the suggestion to determine which profile is responding
      const { data: suggestion } = await supabase
        .from('suggestions')
        .select('*')
        .eq('id', suggestionId)
        .single();

      if (!suggestion) {
        return { success: false, error: 'Suggestion not found' };
      }

      const isProfileOne = suggestion.profile_one_id === profile.id;
      const isProfileTwo = suggestion.profile_two_id === profile.id;

      if (!isProfileOne && !isProfileTwo) {
        return { success: false, error: 'You are not part of this suggestion' };
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (isProfileOne) {
        updateData.profile_one_status = response;
        if (rejectionNote) {
          updateData.profile_one_rejection_note = rejectionNote;
        }
      } else {
        updateData.profile_two_status = response;
        if (rejectionNote) {
          updateData.profile_two_rejection_note = rejectionNote;
        }
      }

      const { error } = await supabase
        .from('suggestions')
        .update(updateData)
        .eq('id', suggestionId);

      if (error) {
        console.error('Error responding to suggestion:', error);
        return { success: false, error: error.message };
      }

      // Send notifications if rejected
      if (response === 'rejected') {
        try {
          // Get the full suggestion with profile information
          const { data: suggestion } = await supabase
            .from('suggestions')
            .select(`
              *,
              suggester_profile:profiles!suggestions_suggester_id_fkey(id, user_id, first_name, last_name),
              profile_one:profiles!suggestions_profile_one_id_fkey(id, user_id, first_name, last_name),
              profile_two:profiles!suggestions_profile_two_id_fkey(id, user_id, first_name, last_name)
            `)
            .eq('id', suggestionId)
            .single();

          if (suggestion) {
            const profileOne = suggestion.profile_one;
            const profileTwo = suggestion.profile_two;
            const suggester = suggestion.suggester_profile;
            const rejectingProfile = isProfileOne ? profileOne : profileTwo;
            const otherProfile = isProfileOne ? profileTwo : profileOne;

            // Notify the suggester
            if (suggester && suggester.user_id && suggester.id !== profile.id) {
              await notificationService.sendNotification(
                suggester.user_id,
                'Match Suggestion Declined',
                `${rejectingProfile?.first_name} ${rejectingProfile?.last_name} declined your match suggestion${rejectionNote ? ': ' + rejectionNote : '.'}`,
                {
                  type: 'suggestion_rejected',
                  suggestionId: suggestionId,
                  rejectedBy: profile.id,
                }
              );
            }

            // Notify the other profile (the one who wasn't the one rejecting)
            if (otherProfile && otherProfile.user_id && otherProfile.id !== profile.id) {
              await notificationService.sendNotification(
                otherProfile.user_id,
                'Match Suggestion Declined',
                `${rejectingProfile?.first_name} ${rejectingProfile?.last_name} declined the match suggestion${rejectionNote ? ': ' + rejectionNote : '.'}`,
                {
                  type: 'suggestion_rejected',
                  suggestionId: suggestionId,
                  rejectedBy: profile.id,
                }
              );
            }
          }
        } catch (notifError) {
          console.error('Error sending rejection notifications:', notifError);
          // Don't fail the rejection if notification fails
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in respondToSuggestion:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Revert a rejected suggestion back to pending
   * Allows a user to change their mind after declining
   */
  async revertRejection(suggestionId: string): Promise<{ success: boolean; error?: string }> {
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

      // Get the suggestion to determine which profile is reverting
      const { data: suggestion } = await supabase
        .from('suggestions')
        .select('*')
        .eq('id', suggestionId)
        .single();

      if (!suggestion) {
        return { success: false, error: 'Suggestion not found' };
      }

      const isProfileOne = suggestion.profile_one_id === profile.id;
      const isProfileTwo = suggestion.profile_two_id === profile.id;

      if (!isProfileOne && !isProfileTwo) {
        return { success: false, error: 'You are not part of this suggestion' };
      }

      // Check if this profile actually rejected
      const myStatus = isProfileOne ? suggestion.profile_one_status : suggestion.profile_two_status;
      if (myStatus !== 'rejected') {
        return { success: false, error: 'You have not rejected this suggestion' };
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Revert the status back to pending and clear rejection note
      if (isProfileOne) {
        updateData.profile_one_status = 'pending';
        updateData.profile_one_rejection_note = null;
      } else {
        updateData.profile_two_status = 'pending';
        updateData.profile_two_rejection_note = null;
      }

      // Update overall suggestion status if needed
      // If both were rejected and one is reverting, status should be pending
      // If only one rejected and they're reverting, status should be pending or accepted (depending on other status)
      const otherStatus = isProfileOne ? suggestion.profile_two_status : suggestion.profile_one_status;
      if (suggestion.status === 'rejected') {
        // If overall status was rejected, change it based on other party's status
        if (otherStatus === 'rejected') {
          updateData.status = 'pending'; // Both were rejected, now one is pending
        } else if (otherStatus === 'accepted') {
          updateData.status = 'pending'; // Other accepted, this one reverting to pending
        } else {
          updateData.status = 'pending'; // Other is pending, this one reverting to pending
        }
      }

      const { error } = await supabase
        .from('suggestions')
        .update(updateData)
        .eq('id', suggestionId);

      if (error) {
        console.error('Error reverting rejection:', error);
        return { success: false, error: error.message };
      }

      // Send notification to the suggester and other profile that the rejection was reverted
      try {
        const { data: updatedSuggestion } = await supabase
          .from('suggestions')
          .select(`
            *,
            suggester_profile:profiles!suggestions_suggester_id_fkey(id, user_id, first_name, last_name),
            profile_one:profiles!suggestions_profile_one_id_fkey(id, user_id, first_name, last_name),
            profile_two:profiles!suggestions_profile_two_id_fkey(id, user_id, first_name, last_name)
          `)
          .eq('id', suggestionId)
          .single();

        if (updatedSuggestion) {
          const profileOne = updatedSuggestion.profile_one;
          const profileTwo = updatedSuggestion.profile_two;
          const suggester = updatedSuggestion.suggester_profile;
          const revertingProfile = isProfileOne ? profileOne : profileTwo;
          const otherProfile = isProfileOne ? profileTwo : profileOne;

          // Notify the suggester
          if (suggester && suggester.user_id && suggester.id !== profile.id) {
            await notificationService.sendNotification(
              suggester.user_id,
              'Suggestion Response Changed',
              `${revertingProfile?.first_name} ${revertingProfile?.last_name} changed their mind and is now considering the match suggestion.`,
              {
                type: 'suggestion_reverted',
                suggestionId: suggestionId,
                revertedBy: profile.id,
              }
            );
          }

          // Notify the other profile if they had accepted
          if (otherProfile && otherProfile.user_id && otherProfile.id !== profile.id) {
            const otherStatus = isProfileOne ? updatedSuggestion.profile_two_status : updatedSuggestion.profile_one_status;
            if (otherStatus === 'accepted' || otherStatus === 'pending') {
              await notificationService.sendNotification(
                otherProfile.user_id,
                'Suggestion Response Changed',
                `${revertingProfile?.first_name} ${revertingProfile?.last_name} changed their mind and is now considering the match suggestion.`,
                {
                  type: 'suggestion_reverted',
                  suggestionId: suggestionId,
                  revertedBy: profile.id,
                }
              );
            }
          }
        }
      } catch (notifError) {
        console.error('Error sending revert notifications:', notifError);
        // Don't fail the revert if notification fails
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in revertRejection:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set continuation choice for a suggestion
   */
  async setContinuationChoice(
    suggestionId: string,
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

      // Get the suggestion
      const { data: suggestion } = await supabase
        .from('suggestions')
        .select('*')
        .eq('id', suggestionId)
        .single();

      if (!suggestion) {
        return { success: false, error: 'Suggestion not found' };
      }

      const isProfileOne = suggestion.profile_one_id === profile.id;
      const isProfileTwo = suggestion.profile_two_id === profile.id;

      if (!isProfileOne && !isProfileTwo) {
        return { success: false, error: 'You are not part of this suggestion' };
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (isProfileOne) {
        updateData.profile_one_continuation_choice = choice;
        if (middlePersonId) {
          updateData.profile_one_middle_person_id = middlePersonId;
        }
      } else {
        updateData.profile_two_continuation_choice = choice;
        if (middlePersonId) {
          updateData.profile_two_middle_person_id = middlePersonId;
        }
      }

      const { error } = await supabase
        .from('suggestions')
        .update(updateData)
        .eq('id', suggestionId);

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
   * Get all suggestions for the current user
   */
  async getMySuggestions(): Promise<{
    success: boolean;
    error?: string;
    receivedSuggestions?: Suggestion[];
    madeSuggestions?: Suggestion[];
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

      // Parallelize received and made suggestions queries
      const [receivedQuery, madeQuery] = await Promise.all([
        supabase
          .from('suggestions')
          .select(`
            *,
            suggester_profile:profiles!suggestions_suggester_id_fkey(id, first_name, last_name, dob, pictures, gender),
            profile_one:profiles!suggestions_profile_one_id_fkey(id, first_name, last_name, dob, pictures, gender, phone, email, whatsapp, resume_url),
            profile_two:profiles!suggestions_profile_two_id_fkey(id, first_name, last_name, dob, pictures, gender, phone, email, whatsapp, resume_url),
            profile_one_middle_person:profiles!suggestions_profile_one_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp),
            profile_two_middle_person:profiles!suggestions_profile_two_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp)
          `)
          .or(`profile_one_id.eq.${profile.id},profile_two_id.eq.${profile.id}`)
          .order('created_at', { ascending: false }),
        supabase
          .from('suggestions')
          .select(`
            *,
            suggester_profile:profiles!suggestions_suggester_id_fkey(id, first_name, last_name, dob, pictures, gender),
            profile_one:profiles!suggestions_profile_one_id_fkey(id, first_name, last_name, dob, pictures, gender, phone, email, whatsapp, resume_url),
            profile_two:profiles!suggestions_profile_two_id_fkey(id, first_name, last_name, dob, pictures, gender, phone, email, whatsapp, resume_url),
            profile_one_middle_person:profiles!suggestions_profile_one_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp),
            profile_two_middle_person:profiles!suggestions_profile_two_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp)
          `)
          .eq('suggester_id', profile.id)
          .order('created_at', { ascending: false }),
      ]);

      const { data: received, error: receivedError } = receivedQuery;
      const { data: made, error: madeError } = madeQuery;

      if (receivedError || madeError) {
        console.error('Error fetching suggestions:', receivedError || madeError);
        return { success: false, error: (receivedError || madeError)?.message };
      }

      return {
        success: true,
        receivedSuggestions: received || [],
        madeSuggestions: made || [],
      };
    } catch (error: any) {
      console.error('Error in getMySuggestions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get contact information based on continuation choices
   */
  getContactInfo(suggestion: Suggestion, currentProfileId: string): {
    shouldShowContact: boolean;
    contactPerson?: {
      name: string;
      phone?: string;
      email?: string;
      whatsapp?: string;
      resumeUrl?: string;
    };
    message: string;
  } {
    const isProfileOne = suggestion.profile_one_id === currentProfileId;
    const isProfileTwo = suggestion.profile_two_id === currentProfileId;

    if (!isProfileOne && !isProfileTwo) {
      return {
        shouldShowContact: false,
        message: 'You are not part of this suggestion',
      };
    }

    // Both must have made their choices
    if (!suggestion.profile_one_continuation_choice || !suggestion.profile_two_continuation_choice) {
      return {
        shouldShowContact: false,
        message: 'Waiting for both parties to choose how to continue...',
      };
    }

    const profileOneByThemselves = suggestion.profile_one_continuation_choice === 'by_themselves';
    const profileTwoByThemselves = suggestion.profile_two_continuation_choice === 'by_themselves';

    // Both chose by_themselves - share direct contact
    if (profileOneByThemselves && profileTwoByThemselves) {
      const contactProfile = isProfileOne ? suggestion.profile_two : suggestion.profile_one;
      if (!contactProfile) {
        return {
          shouldShowContact: false,
          message: 'Contact information not available',
        };
      }
      const profile = contactProfile as any;
      return {
        shouldShowContact: true,
        contactPerson: {
          name: `${profile.first_name} ${profile.last_name}`,
          phone: profile.phone,
          email: profile.email,
          whatsapp: profile.whatsapp,
          resumeUrl: profile.resume_url || undefined,
        },
        message: 'Both chose to continue directly. Contact info below:',
      };
    }

    // One chose Matchmaker/Shadchan, one chose by_themselves
    if (profileOneByThemselves && !profileTwoByThemselves) {
      const middlePerson = suggestion.profile_two_middle_person as any;
      if (!middlePerson) {
        return {
          shouldShowContact: false,
          message: 'Contact information not available',
        };
      }
      return {
        shouldShowContact: true,
        contactPerson: {
          name: `${middlePerson.first_name} ${middlePerson.last_name}`,
          phone: middlePerson.phone,
          email: middlePerson.email,
          whatsapp: middlePerson.whatsapp,
        },
        message: isProfileOne 
          ? `Contact ${middlePerson.first_name} (their Matchmaker/Shadchan):`
          : `Contact ${middlePerson.first_name} (your Matchmaker/Shadchan):`,
      };
    }

    if (!profileOneByThemselves && profileTwoByThemselves) {
      const middlePerson = suggestion.profile_one_middle_person as any;
      if (!middlePerson) {
        return {
          shouldShowContact: false,
          message: 'Contact information not available',
        };
      }
      return {
        shouldShowContact: true,
        contactPerson: {
          name: `${middlePerson.first_name} ${middlePerson.last_name}`,
          phone: middlePerson.phone,
          email: middlePerson.email,
          whatsapp: middlePerson.whatsapp,
        },
        message: isProfileOne 
          ? `Contact ${middlePerson.first_name} (your Matchmaker/Shadchan):`
          : `Contact ${middlePerson.first_name} (their Matchmaker/Shadchan):`,
      };
    }

    // Both chose Matchmaker/Shadchan
    const middlePerson = (isProfileOne 
      ? suggestion.profile_one_middle_person 
      : suggestion.profile_two_middle_person) as any;
    
    if (!middlePerson) {
      return {
        shouldShowContact: false,
        message: 'Contact information not available',
      };
    }
    
    return {
      shouldShowContact: true,
      contactPerson: {
        name: `${middlePerson.first_name} ${middlePerson.last_name}`,
        phone: middlePerson.phone,
        email: middlePerson.email,
        whatsapp: middlePerson.whatsapp,
      },
      message: `Contact your Matchmaker/Shadchan ${middlePerson.first_name}:`,
    };
  }
}

export const suggestionService = new SuggestionService();

