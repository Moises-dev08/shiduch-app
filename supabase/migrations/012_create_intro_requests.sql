-- Create intro_requests table for "Ask for Intro" feature
CREATE TABLE IF NOT EXISTS public.intro_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requester_middle_person_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_middle_person_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  requester_continuation_choice TEXT CHECK (requester_continuation_choice IN ('by_themselves', 'with_middle_person')),
  requested_continuation_choice TEXT CHECK (requested_continuation_choice IN ('by_themselves', 'with_middle_person')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  requested_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_intro CHECK (requester_id != requested_profile_id),
  CONSTRAINT unique_active_intro UNIQUE (requester_id, requested_profile_id, status)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_intro_requests_requester ON public.intro_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_intro_requests_requested ON public.intro_requests(requested_profile_id);
CREATE INDEX IF NOT EXISTS idx_intro_requests_status ON public.intro_requests(status);
CREATE INDEX IF NOT EXISTS idx_intro_requests_middle_persons ON public.intro_requests(requester_middle_person_id, requested_middle_person_id);

-- Enable RLS
ALTER TABLE public.intro_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view intro requests they're involved in
CREATE POLICY "Users can view own intro requests"
  ON public.intro_requests
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id IN (
        requester_id, 
        requested_profile_id, 
        requester_middle_person_id, 
        requested_middle_person_id
      )
    )
  );

-- Policy: Requesters can create intro requests
CREATE POLICY "Users can create intro requests"
  ON public.intro_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.profiles WHERE id = requester_id)
  );

-- Policy: Requested users and middle persons can update
CREATE POLICY "Users can update intro requests"
  ON public.intro_requests
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.profiles WHERE id IN (
        requester_id,
        requested_profile_id,
        requester_middle_person_id,
        requested_middle_person_id
      )
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_intro_requests_updated_at
  BEFORE UPDATE ON public.intro_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.intro_requests IS 'Stores "Ask for Intro" requests with middle person coordination';
COMMENT ON COLUMN public.intro_requests.requester_continuation_choice IS 'How requester wants to continue after match';
COMMENT ON COLUMN public.intro_requests.requested_continuation_choice IS 'How requested person wants to continue after match';

