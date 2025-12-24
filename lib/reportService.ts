import { supabase } from './supabase';

export interface ProfileReport {
  id: string;
  reporter_id: string;
  reported_profile_id: string;
  reasons: string[];
  additional_details?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  
  // Joined data
  reporter?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  reported_profile?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export type ReportReason = 'fake_profile' | 'underage' | 'non_serious';

class ReportService {
  /**
   * Submit a report about a profile
   */
  async reportProfile(
    reportedProfileId: string,
    reasons: ReportReason[],
    additionalDetails?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get reporter's profile ID
      const { data: reporterProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !reporterProfile) {
        return { success: false, error: 'Reporter profile not found' };
      }

      // Convert reason enums to readable strings
      const reasonStrings = reasons.map(reason => {
        switch (reason) {
          case 'fake_profile':
            return 'Fake Profile';
          case 'underage':
            return 'Underage';
          case 'non_serious':
            return 'Non-Serious Relationship Intentions';
          default:
            return reason;
        }
      });

      // Create the report
      const { error: insertError } = await supabase
        .from('profile_reports')
        .insert({
          reporter_id: reporterProfile.id,
          reported_profile_id: reportedProfileId,
          reasons: reasonStrings,
          additional_details: additionalDetails || null,
          status: 'pending',
        });

      if (insertError) {
        console.error('Error creating report:', insertError);
        return { success: false, error: 'Failed to submit report' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error reporting profile:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get all reports (admin only)
   */
  async getAllReports(): Promise<{ success: boolean; reports?: ProfileReport[]; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if user is admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (adminError || !adminUser) {
        return { success: false, error: 'Unauthorized - Admin access required' };
      }

      // Fetch all reports with profile information
      const { data: reports, error: reportsError } = await supabase
        .from('profile_reports')
        .select(`
          *,
          reporter:reporter_id(id, first_name, last_name),
          reported_profile:reported_profile_id(id, first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (reportsError) {
        console.error('Error fetching reports:', reportsError);
        return { success: false, error: 'Failed to fetch reports' };
      }

      return { success: true, reports: reports as unknown as ProfileReport[] };
    } catch (error) {
      console.error('Error getting reports:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Get pending reports count (admin only)
   */
  async getPendingReportsCount(): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if user is admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (adminError || !adminUser) {
        return { success: false, error: 'Unauthorized - Admin access required' };
      }

      const { count, error: countError } = await supabase
        .from('profile_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (countError) {
        console.error('Error counting reports:', countError);
        return { success: false, error: 'Failed to count reports' };
      }

      return { success: true, count: count || 0 };
    } catch (error) {
      console.error('Error counting reports:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  /**
   * Update report status (admin only)
   */
  async updateReportStatus(
    reportId: string,
    status: 'reviewed' | 'dismissed' | 'actioned',
    adminNotes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Check if user is admin
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (adminError || !adminUser) {
        return { success: false, error: 'Unauthorized - Admin access required' };
      }

      const { error: updateError } = await supabase
        .from('profile_reports')
        .update({
          status,
          admin_notes: adminNotes || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (updateError) {
        console.error('Error updating report:', updateError);
        return { success: false, error: 'Failed to update report' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating report status:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }
}

export const reportService = new ReportService();

