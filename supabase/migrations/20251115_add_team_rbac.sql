-- RBAC foundational tables
CREATE TYPE public.team_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.team_role NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS team_members_user_idx ON public.team_members(user_id, team_id);

CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  role public.team_role NOT NULL DEFAULT 'viewer',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS team_invitations_email_idx ON public.team_invitations(email);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teams are private" ON public.teams;
CREATE POLICY "Team members can view teams"
  ON public.teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners manage their team"
  ON public.teams
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "View own membership" ON public.team_members;
CREATE POLICY "Members manage roster"
  ON public.team_members
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin')
    )
    OR team_members.user_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin')
    )
  );

DROP POLICY IF EXISTS "Invitations only for admins" ON public.team_invitations;
CREATE POLICY "Owners/admins manage invitations"
  ON public.team_invitations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.team_id = team_invitations.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.team_id = team_invitations.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin')
    )
  );

-- Ensure every existing user owning resources has a personal team
WITH existing_users AS (
  SELECT DISTINCT user_id FROM public.gmb_accounts WHERE user_id IS NOT NULL
  UNION
  SELECT DISTINCT user_id FROM public.gmb_locations WHERE user_id IS NOT NULL
  UNION
  SELECT DISTINCT user_id FROM public.gmb_reviews WHERE user_id IS NOT NULL
  UNION
  SELECT DISTINCT user_id FROM public.gmb_questions WHERE user_id IS NOT NULL
)
INSERT INTO public.teams (name, owner_id)
SELECT
  CONCAT('Workspace ', LEFT(e.user_id::text, 8)),
  e.user_id
FROM existing_users e
WHERE NOT EXISTS (
  SELECT 1 FROM public.teams t WHERE t.owner_id = e.user_id
);

INSERT INTO public.team_members (team_id, user_id, role)
SELECT t.id, t.owner_id, 'owner'
FROM public.teams t
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Attach team_id to existing resource tables
ALTER TABLE public.gmb_accounts ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);
ALTER TABLE public.gmb_locations ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);
ALTER TABLE public.gmb_reviews ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);
ALTER TABLE public.gmb_questions ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

UPDATE public.gmb_accounts ga
SET team_id = t.id
FROM public.teams t
WHERE t.owner_id = ga.user_id
  AND ga.team_id IS NULL;

UPDATE public.gmb_locations gl
SET team_id = t.id
FROM public.teams t
WHERE t.owner_id = gl.user_id
  AND gl.team_id IS NULL;

UPDATE public.gmb_reviews gr
SET team_id = t.id
FROM public.teams t
WHERE t.owner_id = gr.user_id
  AND gr.team_id IS NULL;

UPDATE public.gmb_questions gq
SET team_id = t.id
FROM public.teams t
WHERE t.owner_id = gq.user_id
  AND gq.team_id IS NULL;

ALTER TABLE public.gmb_accounts ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.gmb_locations ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.gmb_reviews ALTER COLUMN team_id SET NOT NULL;
ALTER TABLE public.gmb_questions ALTER COLUMN team_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gmb_accounts_team ON public.gmb_accounts(team_id);
CREATE INDEX IF NOT EXISTS idx_gmb_locations_team ON public.gmb_locations(team_id);
CREATE INDEX IF NOT EXISTS idx_gmb_reviews_team ON public.gmb_reviews(team_id);
CREATE INDEX IF NOT EXISTS idx_gmb_questions_team ON public.gmb_questions(team_id);

-- Team aware policies for core resources
CREATE POLICY IF NOT EXISTS "Team members read locations"
  ON public.gmb_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = gmb_locations.team_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Team editors manage locations"
  ON public.gmb_locations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = gmb_locations.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin','editor')
    )
  );

CREATE POLICY IF NOT EXISTS "Team editors update locations"
  ON public.gmb_locations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = gmb_locations.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = gmb_locations.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin','editor')
    )
  );

CREATE POLICY IF NOT EXISTS "Team admins delete locations"
  ON public.gmb_locations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = gmb_locations.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin')
    )
  );

CREATE POLICY IF NOT EXISTS "Team members read reviews"
  ON public.gmb_reviews
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = gmb_reviews.team_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Team editors manage reviews"
  ON public.gmb_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = gmb_reviews.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = gmb_reviews.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin','editor')
    )
  );

CREATE POLICY IF NOT EXISTS "Team members read questions"
  ON public.gmb_questions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = gmb_questions.team_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Team editors manage questions"
  ON public.gmb_questions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = gmb_questions.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin','editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = gmb_questions.team_id
        AND tm.user_id = auth.uid()
        AND tm.role IN ('owner','admin','editor')
    )
  );

COMMENT ON TABLE public.teams IS 'Shared workspaces for RBAC.';
COMMENT ON TABLE public.team_members IS 'Link users to teams with explicit roles.';
COMMENT ON TABLE public.team_invitations IS 'Pending invitations for team collaboration.';

