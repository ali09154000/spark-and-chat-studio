ALTER TABLE public.practice_sessions
  ADD COLUMN practice_group_id uuid;

CREATE UNIQUE INDEX practice_sessions_user_group_attempt_uidx
  ON public.practice_sessions (user_id, practice_group_id, attempt)
  WHERE practice_group_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.consume_voice_session_ticket(p_token_hash text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.voice_session_tickets
  SET used_at = now()
  WHERE token_hash = p_token_hash
    AND audience_path = '/api/live'
    AND used_at IS NULL
    AND expires_at > now()
  RETURNING user_id;
$$;

REVOKE ALL ON FUNCTION public.consume_voice_session_ticket(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_voice_session_ticket(text) TO service_role;