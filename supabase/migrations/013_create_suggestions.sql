-- Create suggestions table for match suggestions
CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suggester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_one_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  profile_two_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT,
  
  -- Responses from both profiles
  profile_one_status TEXT DEFAULT 'pending' CHECK (profile_one_status IN ('pending', 'accepted', 'rejected')),
  profile_two_status TEXT DEFAULT 'pending' CHECK (profile_two_status IN ('pending', 'accepted', 'rejected')),
  
  -- Continuation choices (same as intro_requests)
  profile_one_continuation_choice TEXT CHECK (profile_one_continuation_choice IN ('by_themselves', 'with_middle_person')),
  profile_two_continuation_choice TEXT CHECK (profile_two_continuation_choice IN ('by_themselves', 'with_middle_person')),
  
  -- Middle persons (if they choose to continue with one)
  profile_one_middle_person_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  profile_two_middle_person_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Rejection notes
  profile_one_rejection_note TEXT,
  profile_two_rejection_note TEXT,
  
  -- Overall status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure profile_one and profile_two are different
  CHECK (profile_one_id != profile_two_id),
  
  -- Ensure suggester is not suggesting themselves
  CHECK (suggester_id != profile_one_id AND suggester_id != profile_two_id)
);

-- Add indexes for faster queries
CREATE INDEX idx_suggestions_suggester ON suggestions(suggester_id);
CREATE INDEX idx_suggestions_profile_one ON suggestions(profile_one_id);
CREATE INDEX idx_suggestions_profile_two ON suggestions(profile_two_id);
CREATE INDEX idx_suggestions_status ON suggestions(status);
CREATE INDEX idx_suggestions_created_at ON suggestions(created_at DESC);

-- Add RLS policies
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view suggestions where they are involved (suggester or one of the profiles)
CREATE POLICY "Users can view their suggestions"
  ON suggestions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.id = suggestions.suggester_id OR
        profiles.id = suggestions.profile_one_id OR
        profiles.id = suggestions.profile_two_id
      )
    )
  );

-- Policy: Authenticated users can create suggestions
CREATE POLICY "Authenticated users can create suggestions"
  ON suggestions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.id = suggestions.suggester_id
    )
  );

-- Policy: Users can update suggestions where they are one of the profiles (to respond)
CREATE POLICY "Users can update their suggestion responses"
  ON suggestions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND (
        profiles.id = suggestions.profile_one_id OR
        profiles.id = suggestions.profile_two_id
      )
    )
  );

-- Function to automatically update the overall status
CREATE OR REPLACE FUNCTION update_suggestion_status()
RETURNS TRIGGER AS $$
BEGIN
  -- If both accepted and both have continuation choices, mark as completed
  IF NEW.profile_one_status = 'accepted' 
     AND NEW.profile_two_status = 'accepted'
     AND NEW.profile_one_continuation_choice IS NOT NULL
     AND NEW.profile_two_continuation_choice IS NOT NULL THEN
    NEW.status := 'completed';
  -- If either rejected, mark as rejected
  ELSIF NEW.profile_one_status = 'rejected' OR NEW.profile_two_status = 'rejected' THEN
    NEW.status := 'rejected';
  -- If both accepted but no continuation choices yet
  ELSIF NEW.profile_one_status = 'accepted' AND NEW.profile_two_status = 'accepted' THEN
    NEW.status := 'accepted';
  -- Otherwise pending
  ELSE
    NEW.status := 'pending';
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_suggestion_status_trigger
  BEFORE UPDATE ON suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_suggestion_status();

