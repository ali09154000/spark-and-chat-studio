CREATE TABLE public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  learning_level text NOT NULL DEFAULT 'B1',
  learning_goals text NOT NULL DEFAULT '',
  preferred_english text NOT NULL DEFAULT 'International English',
  daily_target_minutes integer NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "People can manage their own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.coach_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_conversations TO authenticated;
GRANT ALL ON public.coach_conversations TO service_role;
ALTER TABLE public.coach_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "People can manage their own coach conversations" ON public.coach_conversations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX coach_conversations_user_updated_idx ON public.coach_conversations (user_id, updated_at DESC);

CREATE TABLE public.coach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.coach_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  message_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, message_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_messages TO authenticated;
GRANT ALL ON public.coach_messages TO service_role;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "People can manage their own coach messages" ON public.coach_messages FOR ALL TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.coach_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid())) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.coach_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
CREATE INDEX coach_messages_conversation_created_idx ON public.coach_messages (conversation_id, created_at);

CREATE TABLE public.practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL DEFAULT 'Free speaking',
  mode text NOT NULL DEFAULT 'free-speaking',
  attempt smallint NOT NULL DEFAULT 1 CHECK (attempt BETWEEN 1 AND 3),
  duration_seconds integer NOT NULL DEFAULT 0 CHECK (duration_seconds >= 0),
  transcript text NOT NULL DEFAULT '',
  media_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_sessions TO authenticated;
GRANT ALL ON public.practice_sessions TO service_role;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "People can manage their own practice sessions" ON public.practice_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX practice_sessions_user_created_idx ON public.practice_sessions (user_id, created_at DESC);

CREATE TABLE public.speaking_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  practice_session_id uuid NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
  category_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (practice_session_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.speaking_assessments TO authenticated;
GRANT ALL ON public.speaking_assessments TO service_role;
ALTER TABLE public.speaking_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "People can manage their own speaking assessments" ON public.speaking_assessments FOR ALL TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.practice_sessions p WHERE p.id = practice_session_id AND p.user_id = auth.uid())) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.practice_sessions p WHERE p.id = practice_session_id AND p.user_id = auth.uid()));
CREATE INDEX speaking_assessments_user_created_idx ON public.speaking_assessments (user_id, created_at DESC);

CREATE FUNCTION public.create_speakwell_profile() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), NULLIF(NEW.raw_user_meta_data ->> 'name', ''), ''))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_speakwell_profile
AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_speakwell_profile();

CREATE POLICY "People can read their private practice recordings" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'speakwell-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "People can upload their private practice recordings" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'speakwell-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "People can update their private practice recordings" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'speakwell-recordings' AND (storage.foldername(name))[1] = auth.uid()::text) WITH CHECK (bucket_id = 'speakwell-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "People can delete their private practice recordings" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'speakwell-recordings' AND (storage.foldername(name))[1] = auth.uid()::text);