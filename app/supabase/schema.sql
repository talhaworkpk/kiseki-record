-- Supabase Schema for Kiseki Phase 1

-- 1. kiseki_users
CREATE TABLE public.kiseki_users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  kiseki_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. connections
CREATE TABLE public.connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_a_id TEXT NOT NULL,
  user_b_id TEXT NOT NULL,
  status TEXT DEFAULT 'connected',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a_id, user_b_id)
);

-- 3. temporary_messages
CREATE TABLE public.temporary_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  conversation_key TEXT,
  content JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.kiseki_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporary_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- kiseki_users: anyone can read to resolve IDs. Only owner can update.
CREATE POLICY "Users can read any Kiseki user" ON public.kiseki_users FOR SELECT USING (true);
CREATE POLICY "Users can insert their own record" ON public.kiseki_users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own record" ON public.kiseki_users FOR UPDATE USING (auth.uid() = id);

-- connections: users can read, insert, delete if they are user_a or user_b (actually we check their kiseki_id)
-- Wait, RLS for connections based on kiseki_id requires a lookup.
CREATE POLICY "Users can manage their connections" ON public.connections
  USING (
    user_a_id IN (SELECT kiseki_id FROM public.kiseki_users WHERE id = auth.uid()) OR
    user_b_id IN (SELECT kiseki_id FROM public.kiseki_users WHERE id = auth.uid())
  );

-- temporary_messages: users can insert if they are sender, read/delete if they are receiver
CREATE POLICY "Users can insert messages they send" ON public.temporary_messages FOR INSERT
  WITH CHECK (sender_id IN (SELECT kiseki_id FROM public.kiseki_users WHERE id = auth.uid()));
CREATE POLICY "Users can read messages they receive" ON public.temporary_messages FOR SELECT
  USING (receiver_id IN (SELECT kiseki_id FROM public.kiseki_users WHERE id = auth.uid()));
CREATE POLICY "Users can delete messages they receive" ON public.temporary_messages FOR DELETE
  USING (receiver_id IN (SELECT kiseki_id FROM public.kiseki_users WHERE id = auth.uid()));

-- Enable Realtime for temporary_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.temporary_messages;
