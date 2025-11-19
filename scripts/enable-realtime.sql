-- Enable Realtime for all app tables
-- Run this in your Supabase SQL Editor

-- Enable realtime for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Enable realtime for intro_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE intro_requests;

-- Enable realtime for suggestions table
ALTER PUBLICATION supabase_realtime ADD TABLE suggestions;

-- Enable realtime for info_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE info_requests;

-- Verify realtime is enabled
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
ORDER BY tablename;

