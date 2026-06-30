-- Community feed / posts table
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_author ON public.posts(author_id);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- All authenticated users can read all posts (public within platform)
CREATE POLICY "Posts visible to authenticated"
  ON public.posts FOR SELECT TO authenticated USING (true);

-- Users can create posts as themselves
CREATE POLICY "Users create own posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (author_id = public.current_profile_id());

-- Users can edit own posts
CREATE POLICY "Users update own posts"
  ON public.posts FOR UPDATE TO authenticated
  USING (author_id = public.current_profile_id());

-- Users and admins can delete posts
CREATE POLICY "Users delete own posts"
  ON public.posts FOR DELETE TO authenticated
  USING (author_id = public.current_profile_id() OR public.has_role(auth.uid(), 'admin'));
