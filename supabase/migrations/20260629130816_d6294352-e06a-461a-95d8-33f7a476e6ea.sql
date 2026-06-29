
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'client', 'freelancer');
CREATE TYPE public.job_status AS ENUM ('open', 'closed', 'in_progress', 'completed');
CREATE TYPE public.application_status AS ENUM ('pending', 'shortlisted', 'rejected', 'accepted', 'withdrawn');
CREATE TYPE public.availability_status AS ENUM ('available', 'busy', 'unavailable');
CREATE TYPE public.experience_level AS ENUM ('entry', 'intermediate', 'expert');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  headline TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- user_roles (separate table — never store roles on profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
$$;

-- RLS policies for profiles
CREATE POLICY "Profiles are viewable by everyone authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth_user_id = auth.uid());
CREATE POLICY "Admins can manage profiles"
  ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role app_role;
  v_full_name TEXT;
BEGIN
  v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'freelancer'::app_role);

  INSERT INTO public.profiles (auth_user_id, full_name)
  VALUES (NEW.id, v_full_name);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- freelancer_profiles
CREATE TABLE public.freelancer_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  experience_years NUMERIC(4,1) DEFAULT 0,
  hourly_rate NUMERIC(10,2),
  availability availability_status DEFAULT 'available',
  resume_url TEXT,
  resume_text TEXT,
  ai_score NUMERIC(5,2),
  ai_summary TEXT,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelancer_profiles TO authenticated;
GRANT ALL ON public.freelancer_profiles TO service_role;
ALTER TABLE public.freelancer_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fp_updated BEFORE UPDATE ON public.freelancer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Freelancer profiles viewable by authenticated"
  ON public.freelancer_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Freelancers manage own profile"
  ON public.freelancer_profiles FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());

-- client_profiles
CREATE TABLE public.client_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_name TEXT,
  industry TEXT,
  website TEXT,
  company_size TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_profiles TO authenticated;
GRANT ALL ON public.client_profiles TO service_role;
ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_cp_updated BEFORE UPDATE ON public.client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Client profiles viewable by authenticated"
  ON public.client_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Clients manage own profile"
  ON public.client_profiles FOR ALL TO authenticated
  USING (profile_id = public.current_profile_id())
  WITH CHECK (profile_id = public.current_profile_id());

-- skills
CREATE TABLE public.skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.skills TO authenticated, anon;
GRANT ALL ON public.skills TO service_role;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read skills" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Admins manage skills" ON public.skills FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- freelancer_skills
CREATE TABLE public.freelancer_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  experience_years NUMERIC(4,1) DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT false,
  ai_score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (freelancer_id, skill_id)
);
CREATE INDEX idx_fs_freelancer ON public.freelancer_skills(freelancer_id);
CREATE INDEX idx_fs_skill ON public.freelancer_skills(skill_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.freelancer_skills TO authenticated;
GRANT ALL ON public.freelancer_skills TO service_role;
ALTER TABLE public.freelancer_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view freelancer skills"
  ON public.freelancer_skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Freelancers manage own skills"
  ON public.freelancer_skills FOR ALL TO authenticated
  USING (freelancer_id = public.current_profile_id())
  WITH CHECK (freelancer_id = public.current_profile_id());

-- jobs
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget_min NUMERIC(12,2),
  budget_max NUMERIC(12,2),
  experience_level experience_level DEFAULT 'intermediate',
  duration TEXT,
  status job_status NOT NULL DEFAULT 'open',
  required_skills TEXT[] DEFAULT '{}',
  ai_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jobs_client ON public.jobs(client_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Open jobs visible to authenticated"
  ON public.jobs FOR SELECT TO authenticated
  USING (status = 'open' OR client_id = public.current_profile_id() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Clients manage own jobs"
  ON public.jobs FOR ALL TO authenticated
  USING (client_id = public.current_profile_id())
  WITH CHECK (client_id = public.current_profile_id());

-- applications
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cover_letter TEXT,
  proposed_rate NUMERIC(10,2),
  status application_status NOT NULL DEFAULT 'pending',
  ai_match_score NUMERIC(5,2),
  ai_insights JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, freelancer_id)
);
CREATE INDEX idx_app_job ON public.applications(job_id);
CREATE INDEX idx_app_freelancer ON public.applications(freelancer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_apps_updated BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Freelancers see own applications"
  ON public.applications FOR SELECT TO authenticated
  USING (freelancer_id = public.current_profile_id()
    OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.client_id = public.current_profile_id())
    OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Freelancers create own applications"
  ON public.applications FOR INSERT TO authenticated
  WITH CHECK (freelancer_id = public.current_profile_id());
CREATE POLICY "Freelancers update own applications"
  ON public.applications FOR UPDATE TO authenticated
  USING (freelancer_id = public.current_profile_id()
    OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.client_id = public.current_profile_id()));

-- portfolios
CREATE TABLE public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  project_url TEXT,
  image_url TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_portfolios_freelancer ON public.portfolios(freelancer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolios TO authenticated;
GRANT SELECT ON public.portfolios TO anon;
GRANT ALL ON public.portfolios TO service_role;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portfolios visible to all" ON public.portfolios FOR SELECT USING (true);
CREATE POLICY "Freelancers manage own portfolio"
  ON public.portfolios FOR ALL TO authenticated
  USING (freelancer_id = public.current_profile_id())
  WITH CHECK (freelancer_id = public.current_profile_id());

-- reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_freelancer ON public.reviews(freelancer_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews visible to all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Clients create reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (client_id = public.current_profile_id());
CREATE POLICY "Clients edit own reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (client_id = public.current_profile_id());

-- notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own notifications"
  ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Seed skills
INSERT INTO public.skills (name, category) VALUES
  ('React', 'Frontend'), ('TypeScript', 'Languages'), ('Node.js', 'Backend'),
  ('Python', 'Languages'), ('PostgreSQL', 'Database'), ('UI/UX Design', 'Design'),
  ('Figma', 'Design'), ('Next.js', 'Frontend'), ('Tailwind CSS', 'Frontend'),
  ('AWS', 'Cloud'), ('Docker', 'DevOps'), ('Machine Learning', 'AI/ML'),
  ('Copywriting', 'Content'), ('SEO', 'Marketing'), ('Product Management', 'Management'),
  ('Mobile Development', 'Mobile'), ('GraphQL', 'Backend'), ('Data Analysis', 'Data');
