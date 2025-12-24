import { supabase } from './supabase';

export interface Feedback {
  id: string;
  user_id: string;
  profile_id: string | null;
  message: string;
  created_at: string;
  updated_at: string;
}

class FeedbackService {
  /**
   * Submit new feedback
   */
  async submitFeedback(message: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      // Get the user's profile ID
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return { success: false, error: 'Failed to fetch profile' };
      }

      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          profile_id: profile?.id || null,
          message: message.trim(),
        });

      if (error) {
        console.error('Error submitting feedback:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error in submitFeedback:', error);
      return { success: false, error: error.message || 'Failed to submit feedback' };
    }
  }

  /**
   * Get all feedback for current user
   */
  async getMyFeedback(): Promise<{ success: boolean; feedback?: Feedback[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching feedback:', error);
        return { success: false, error: error.message };
      }

      return { success: true, feedback: data || [] };
    } catch (error: any) {
      console.error('Error in getMyFeedback:', error);
      return { success: false, error: error.message || 'Failed to fetch feedback' };
    }
  }

  /**
   * Get all feedback (admin only)
   */
  async getAllFeedback(): Promise<{ success: boolean; feedback?: Feedback[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('feedback')
        .select(`
          *,
          profile:profiles(id, first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all feedback:', error);
        return { success: false, error: error.message };
      }

      return { success: true, feedback: data || [] };
    } catch (error: any) {
      console.error('Error in getAllFeedback:', error);
      return { success: false, error: error.message || 'Failed to fetch feedback' };
    }
  }
}

export const feedbackService = new FeedbackService();

