import { Profile } from '../types/homeTypes';
import { supabase } from './supabase';

export interface Suggestion {
  id: string;
  suggester_id: string;
  profile_one_id: string;
  profile_two_id: string;
  note?: string;
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
   * Create a new match suggestion
   */
  async createSuggestion(
    profileOneId: string,
    profileTwoId: string,
    note?: string
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

      // Check if there's already an active suggestion for these profiles
      const { data: existing } = await supabase
        .from('suggestions')
        .select('*')
        .or(`and(profile_one_id.eq.${profileOneId},profile_two_id.eq.${profileTwoId}),and(profile_one_id.eq.${profileTwoId},profile_two_id.eq.${profileOneId})`)
        .in('status', ['pending', 'accepted'])
        .single();

      if (existing) {
        return { success: false, error: 'A suggestion already exists for these profiles' };
      }

      // Create the suggestion
      const { data, error } = await supabase
        .from('suggestions')
        .insert({
          suggester_id: profile.id,
          profile_one_id: profileOneId,
          profile_two_id: profileTwoId,
          note: note || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating suggestion:', error);
        return { success: false, error: error.message };
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

      return { success: true };
    } catch (error: any) {
      console.error('Error in respondToSuggestion:', error);
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

      // Get suggestions where I'm one of the profiles (received suggestions)
      const { data: received, error: receivedError } = await supabase
        .from('suggestions')
        .select(`
          *,
          suggester_profile:profiles!suggestions_suggester_id_fkey(id, first_name, last_name, age, pictures, gender),
          profile_one:profiles!suggestions_profile_one_id_fkey(id, first_name, last_name, age, pictures, gender, phone, email, whatsapp),
          profile_two:profiles!suggestions_profile_two_id_fkey(id, first_name, last_name, age, pictures, gender, phone, email, whatsapp),
          profile_one_middle_person:profiles!suggestions_profile_one_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp),
          profile_two_middle_person:profiles!suggestions_profile_two_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp)
        `)
        .or(`profile_one_id.eq.${profile.id},profile_two_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      // Get suggestions I made
      const { data: made, error: madeError } = await supabase
        .from('suggestions')
        .select(`
          *,
          suggester_profile:profiles!suggestions_suggester_id_fkey(id, first_name, last_name, age, pictures, gender),
          profile_one:profiles!suggestions_profile_one_id_fkey(id, first_name, last_name, age, pictures, gender, phone, email, whatsapp),
          profile_two:profiles!suggestions_profile_two_id_fkey(id, first_name, last_name, age, pictures, gender, phone, email, whatsapp),
          profile_one_middle_person:profiles!suggestions_profile_one_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp),
          profile_two_middle_person:profiles!suggestions_profile_two_middle_person_id_fkey(id, first_name, last_name, phone, email, whatsapp)
        `)
        .eq('suggester_id', profile.id)
        .order('created_at', { ascending: false });

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
    if (profileOneByThemselves && !profileTwoByThemselves) {
      const middlePerson = suggestion.profile_two_middle_person;
      return {
        shouldShowContact: true,
        contactPerson: {
          name: `${middlePerson.first_name} ${middlePerson.last_name}`,
          phone: middlePerson.phone,
          email: middlePerson.email,
          whatsapp: middlePerson.whatsapp,
        },
        message: isProfileOne 
          ? `Contact ${middlePerson.first_name} (their middle person):`
          : `Contact ${middlePerson.first_name} (your middle person):`,
      };
    }

    if (!profileOneByThemselves && profileTwoByThemselves) {
      const middlePerson = suggestion.profile_one_middle_person;
      return {
        shouldShowContact: true,
        contactPerson: {
          name: `${middlePerson.first_name} ${middlePerson.last_name}`,
          phone: middlePerson.phone,
          email: middlePerson.email,
          whatsapp: middlePerson.whatsapp,
        },
        message: isProfileOne 
          ? `Contact ${middlePerson.first_name} (your middle person):`
          : `Contact ${middlePerson.first_name} (their middle person):`,
      };
    }

    // Both chose middle person
    const middlePerson = isProfileOne 
      ? suggestion.profile_one_middle_person 
      : suggestion.profile_two_middle_person;
    
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

export const suggestionService = new SuggestionService();

