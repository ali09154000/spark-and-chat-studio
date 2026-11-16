CREATE TABLE public.voice_session_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  audience_path text NOT NULL DEFAULT '/api/live',
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT, SELECT ON public.voice_session_tickets TO authenticated;
GRANT ALL ON public.voice_session_tickets TO service_role;
ALTER TABLE public.voice_session_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "People can create their own voice session tickets" ON public.voice_session_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "People can view their own voice session tickets" ON public.voice_session_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX voice_session_tickets_expiry_idx ON public.voice_session_tickets (expires_at);