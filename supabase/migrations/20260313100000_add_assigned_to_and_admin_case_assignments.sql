-- Assignation de dossiers admin
-- 1) assigned_to sur projects (pour litiges)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_assigned_to ON projects(assigned_to);

-- 2) Table générique admin_case_assignments
CREATE TABLE IF NOT EXISTS admin_case_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  assigned_to UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT NULL,
  UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_case_assignments_entity ON admin_case_assignments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_case_assignments_assigned_to ON admin_case_assignments(assigned_to);

-- RLS
ALTER TABLE admin_case_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_case_assignments_select" ON admin_case_assignments;
CREATE POLICY "admin_case_assignments_select" ON admin_case_assignments FOR SELECT
  USING (current_user_has_admin_permission('governance', 'read'));

DROP POLICY IF EXISTS "admin_case_assignments_all" ON admin_case_assignments;
CREATE POLICY "admin_case_assignments_all" ON admin_case_assignments FOR ALL
  USING (current_user_has_admin_permission('users', 'assign'))
  WITH CHECK (current_user_has_admin_permission('users', 'assign'));
