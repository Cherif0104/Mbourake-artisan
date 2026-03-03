-- Sprint 4 : Module formation / cohortes / résultats (corrélation performance)

-- Cohortes de formation (un batch = une cohorte)
CREATE TABLE IF NOT EXISTS training_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NULL,
  organisation_id UUID NULL REFERENCES chambres_metier(id) ON DELETE SET NULL,
  starts_at DATE NULL,
  ends_at DATE NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_cohorts_org ON training_cohorts(organisation_id);
CREATE INDEX IF NOT EXISTS idx_training_cohorts_status ON training_cohorts(status);

COMMENT ON TABLE training_cohorts IS 'Cohortes de formation (batch d''artisans)';

ALTER TABLE training_cohorts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read training_cohorts" ON training_cohorts;
CREATE POLICY "Admins read training_cohorts" ON training_cohorts FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
DROP POLICY IF EXISTS "Admins manage training_cohorts" ON training_cohorts;
CREATE POLICY "Admins manage training_cohorts" ON training_cohorts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Org read training_cohorts" ON training_cohorts;
CREATE POLICY "Org read training_cohorts" ON training_cohorts FOR SELECT
  USING (
    organisation_id IN (
      SELECT id FROM chambres_metier WHERE admin_id = auth.uid()
      UNION
      SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()
    )
  );

-- Participants (artisans) par cohorte + résultats
CREATE TABLE IF NOT EXISTS training_cohort_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_id UUID NOT NULL REFERENCES training_cohorts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'completed', 'abandoned')),
  result_score NUMERIC(5, 2) NULL,
  result_notes TEXT NULL,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ NULL,
  UNIQUE(cohort_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_training_cohort_members_cohort ON training_cohort_members(cohort_id);
CREATE INDEX IF NOT EXISTS idx_training_cohort_members_user ON training_cohort_members(user_id);

COMMENT ON TABLE training_cohort_members IS 'Inscription et résultats des artisans par cohorte de formation';

ALTER TABLE training_cohort_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read training_cohort_members" ON training_cohort_members;
CREATE POLICY "Admins read training_cohort_members" ON training_cohort_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
DROP POLICY IF EXISTS "Admins manage training_cohort_members" ON training_cohort_members;
CREATE POLICY "Admins manage training_cohort_members" ON training_cohort_members FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Org read training_cohort_members" ON training_cohort_members;
CREATE POLICY "Org read training_cohort_members" ON training_cohort_members FOR SELECT
  USING (
    cohort_id IN (
      SELECT id FROM training_cohorts WHERE organisation_id IN (
        SELECT id FROM chambres_metier WHERE admin_id = auth.uid()
        UNION
        SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "User read own training_cohort_members" ON training_cohort_members;
CREATE POLICY "User read own training_cohort_members" ON training_cohort_members FOR SELECT
  USING (user_id = auth.uid());

CREATE TRIGGER trg_training_cohorts_updated BEFORE UPDATE ON training_cohorts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
