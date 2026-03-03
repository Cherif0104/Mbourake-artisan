-- Sprint 4 : Module OKR (Objectives and Key Results) pour dashboards exécutifs

-- Périodes OKR (ex. trimestre, année)
CREATE TABLE IF NOT EXISTS okr_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  period_type TEXT NOT NULL DEFAULT 'quarter' CHECK (period_type IN ('quarter', 'year')),
  starts_at DATE NOT NULL,
  ends_at DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_okr_periods_dates ON okr_periods(starts_at, ends_at);

-- Objectifs
CREATE TABLE IF NOT EXISTS okr_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES okr_periods(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_okr_objectives_period ON okr_objectives(period_id);

-- Résultats clés (Key Results)
CREATE TABLE IF NOT EXISTS okr_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES okr_objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_value NUMERIC(14, 4) NOT NULL,
  current_value NUMERIC(14, 4) NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'number' CHECK (unit IN ('number', 'percent', 'currency', 'custom')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_okr_key_results_objective ON okr_key_results(objective_id);

COMMENT ON TABLE okr_periods IS 'Périodes pour les OKR (trimestre, année)';
COMMENT ON TABLE okr_objectives IS 'Objectifs par période';
COMMENT ON TABLE okr_key_results IS 'Résultats clés mesurables par objectif';

ALTER TABLE okr_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE okr_key_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read okr_periods" ON okr_periods;
CREATE POLICY "Admins read okr_periods" ON okr_periods FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
DROP POLICY IF EXISTS "Admins manage okr_periods" ON okr_periods;
CREATE POLICY "Admins manage okr_periods" ON okr_periods FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins read okr_objectives" ON okr_objectives;
CREATE POLICY "Admins read okr_objectives" ON okr_objectives FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
DROP POLICY IF EXISTS "Admins manage okr_objectives" ON okr_objectives;
CREATE POLICY "Admins manage okr_objectives" ON okr_objectives FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Admins read okr_key_results" ON okr_key_results;
CREATE POLICY "Admins read okr_key_results" ON okr_key_results FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));
DROP POLICY IF EXISTS "Admins manage okr_key_results" ON okr_key_results;
CREATE POLICY "Admins manage okr_key_results" ON okr_key_results FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

CREATE TRIGGER trg_okr_periods_updated BEFORE UPDATE ON okr_periods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_okr_objectives_updated BEFORE UPDATE ON okr_objectives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trg_okr_key_results_updated BEFORE UPDATE ON okr_key_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed : une période et un objectif exemple (si aucune période n'existe)
INSERT INTO okr_periods (name, period_type, starts_at, ends_at, is_active)
SELECT 'T1 2025', 'quarter', '2025-01-01'::date, '2025-03-31'::date, true
WHERE NOT EXISTS (SELECT 1 FROM okr_periods LIMIT 1);

INSERT INTO okr_objectives (period_id, title, description, sort_order)
SELECT p.id, 'Croissance plateforme', 'Augmenter l''activité et la satisfaction', 0
FROM okr_periods p
WHERE NOT EXISTS (SELECT 1 FROM okr_objectives LIMIT 1)
LIMIT 1;

INSERT INTO okr_key_results (objective_id, title, target_value, current_value, unit, sort_order)
SELECT o.id, 'Projets complétés (trimestre)', 50, 0, 'number', 0
FROM okr_objectives o
WHERE NOT EXISTS (SELECT 1 FROM okr_key_results LIMIT 1)
LIMIT 1;
INSERT INTO okr_key_results (objective_id, title, target_value, current_value, unit, sort_order)
SELECT o.id, 'Nouveaux artisans vérifiés', 20, 0, 'number', 1
FROM okr_objectives o
WHERE (SELECT COUNT(*) FROM okr_key_results) = 1
LIMIT 1;
