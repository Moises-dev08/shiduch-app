import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create a client with the user's token to verify authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify the user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const userId = user.id;

    console.log('Deleting account for user:', userId);

    // Step 1: Get user profile to find picture paths
    const { data: profile, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('picture1, picture2, picture3')
      .eq('user_id', userId)
      .single();

    if (profileFetchError && profileFetchError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileFetchError);
    }

    // Step 2: Delete profile pictures from storage
    if (profile) {
      const picturePaths = [profile.picture1, profile.picture2, profile.picture3].filter(Boolean);
      
      if (picturePaths.length > 0) {
        const { error: storageError } = await supabaseAdmin.storage
          .from('profile-pictures')
          .remove(picturePaths);

        if (storageError) {
          console.error('Error deleting pictures from storage:', storageError);
          // Continue with deletion even if storage deletion fails
        }
      }
    }

    // Step 3: Delete or update related records
    // Update suggestions where user is suggester or suggested
    const { error: suggestionsError } = await supabaseAdmin
      .from('suggestions')
      .delete()
      .or(`suggester_id.eq.${profile?.id},suggested_profile_id.eq.${profile?.id}`);

    if (suggestionsError) {
      console.error('Error deleting suggestions:', suggestionsError);
    }

    // Delete info requests
    const { error: infoRequestsError } = await supabaseAdmin
      .from('info_requests')
      .delete()
      .or(`requester_id.eq.${profile?.id},requested_profile_id.eq.${profile?.id}`);

    if (infoRequestsError) {
      console.error('Error deleting info requests:', infoRequestsError);
    }

    // Update profiles that have this user as matchmaker
    const { error: matchmakerUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ matchmaker_id: null })
      .eq('matchmaker_id', profile?.id);

    if (matchmakerUpdateError) {
      console.error('Error updating matchmaker references:', matchmakerUpdateError);
    }

    // Step 4: Delete the profile
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId);

    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete profile', details: profileDeleteError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 5: Delete the user from auth (requires admin privileges)
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete user account', details: authDeleteError }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Successfully deleted account for user:', userId);

    return new Response(
      JSON.stringify({ success: true, message: 'Account successfully deleted' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in delete-account function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

