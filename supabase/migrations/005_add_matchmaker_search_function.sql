-- Create function to find matchmaker by their authentication email
-- This allows searching for matchmakers using the email they signed up with,
-- not the email in their profile (which may be different)

CREATE OR REPLACE FUNCTION get_matchmaker_by_auth_email(search_email TEXT)
RETURNS TABLE (
  profile_id UUID,
  auth_email TEXT,
  profile_email TEXT,
  first_name TEXT,
  last_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as profile_id,
    au.email::TEXT as auth_email,
    p.email::TEXT as profile_email,
    p.first_name::TEXT,
    p.last_name::TEXT
  FROM auth.users au
  JOIN public.profiles p ON au.id = p.user_id
  WHERE LOWER(au.email) = LOWER(search_email)
    AND p.role = 'matchmaker'
    AND p.status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION get_matchmaker_by_auth_email IS 'Searches for an approved matchmaker using their authentication email (signup email)';

