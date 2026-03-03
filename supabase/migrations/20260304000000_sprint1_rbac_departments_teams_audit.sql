-- Sprint 1: RBAC + Departments/Teams + Audit logs (idempotent)
-- Tables: admin_roles, admin_permissions, admin_role_permissions, admin_user_role_assignments,
--         departments, teams, team_members, admin_audit_logs

-- ========== 1) Roles ==========
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'global' CHECK (scope_type IN ('global', 'organisation', 'department', 'team')),
  is_system BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== 2) Permissions ==========
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (module, action)
);

-- ========== 3) Role-Permissions ==========
CREATE TABLE IF NOT EXISTS admin_role_permissions (
  role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES admin_permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- ========== 4) User role assignments ==========
CREATE TABLE IF NOT EXISTS admin_user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL DEFAULT 'global' CHECK (scope_type IN ('global', 'organisation', 'department', 'team')),
  scope_id UUID NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ NULL,
  assigned_by UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_user_roles_user ON admin_user_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_role ON admin_user_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_user_roles_scope ON admin_user_role_assignments(scope_type, scope_id);

-- ========== 5) Departments ==========
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL UNIQUE,
  parent_department_id UUID NULL REFERENCES departments(id) ON DELETE SET NULL,
  manager_user_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========== 6) Teams ==========
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  code TEXT,
  name TEXT NOT NULL,
  manager_user_id UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (department_id, name)
);

CREATE INDEX IF NOT EXISTS idx_teams_department ON teams(department_id);

-- ========== 7) Team members ==========
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_in_team TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- ========== 8) Audit logs ==========
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NULL,
  scope_type TEXT NULL,
  scope_id UUID NULL,
  reason TEXT NULL,
  old_data JSONB NULL,
  new_data JSONB NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON admin_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_entity ON admin_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_logs(created_at DESC);

-- ========== 9) Seeds roles ==========
INSERT INTO admin_roles (code, name, scope_type, is_system) VALUES
  ('super_admin', 'Super Administrateur', 'global', true),
  ('platform_admin', 'Administrateur Plateforme', 'global', true),
  ('department_manager', 'Manager Département', 'department', true),
  ('org_admin', 'Administrateur Organisation', 'organisation', true),
  ('org_manager', 'Manager Organisation', 'organisation', true),
  ('client_success_agent', 'Agent Relation Client', 'team', true),
  ('sales_manager', 'Manager Commercial', 'team', true),
  ('compliance_officer', 'Agent Conformité', 'team', true),
  ('training_manager', 'Manager Formation', 'team', true),
  ('auditor_readonly', 'Auditeur Lecture seule', 'global', true)
ON CONFLICT (code) DO NOTHING;

-- ========== 10) Seeds permissions ==========
INSERT INTO admin_permissions (module, action) VALUES
  ('users', 'read'), ('users', 'create'), ('users', 'update'), ('users', 'delete'), ('users', 'approve'), ('users', 'assign'), ('users', 'export'),
  ('organisations', 'read'), ('organisations', 'create'), ('organisations', 'update'), ('organisations', 'delete'), ('organisations', 'approve'), ('organisations', 'assign'), ('organisations', 'export'),
  ('finance', 'read'), ('finance', 'create'), ('finance', 'update'), ('finance', 'approve'), ('finance', 'export'), ('finance', 'finance_manage'),
  ('training', 'read'), ('training', 'create'), ('training', 'update'), ('training', 'approve'), ('training', 'export'),
  ('bi', 'read'), ('bi', 'export'), ('bi', 'configure'),
  ('governance', 'read'), ('governance', 'create'), ('governance', 'update'), ('governance', 'approve')
ON CONFLICT (module, action) DO NOTHING;

-- ========== 11) Seed role_permissions (super_admin = full) ==========
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r CROSS JOIN admin_permissions p WHERE r.code = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- platform_admin: all except delete users/organisations and finance_manage
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r CROSS JOIN admin_permissions p
WHERE r.code = 'platform_admin'
  AND NOT (p.module IN ('users', 'organisations') AND p.action = 'delete')
  AND NOT (p.module = 'finance' AND p.action = 'finance_manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- auditor_readonly: read + export only
INSERT INTO admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM admin_roles r CROSS JOIN admin_permissions p
WHERE r.code = 'auditor_readonly' AND p.action IN ('read', 'export')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ========== 12) Helper: has_admin_permission ==========
CREATE OR REPLACE FUNCTION has_admin_permission(p_user_id UUID, p_module TEXT, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_user_role_assignments a
    JOIN admin_role_permissions rp ON rp.role_id = a.role_id
    JOIN admin_permissions p ON p.id = rp.permission_id
    WHERE a.user_id = p_user_id
      AND a.is_active = true
      AND (a.valid_to IS NULL OR a.valid_to > NOW())
      AND p.module = p_module
      AND p.action = p_action
      AND p.is_active = true
  );
$$;

-- Fallback: profiles.role = 'admin' => full access (rétrocompat)
CREATE OR REPLACE FUNCTION current_user_has_admin_permission(p_module TEXT, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'admin' FROM profiles WHERE id = auth.uid()),
    false
  ) OR has_admin_permission(auth.uid(), p_module, p_action);
$$;

-- Exposer pour appels RPC depuis le client
GRANT EXECUTE ON FUNCTION current_user_has_admin_permission(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION has_admin_permission(UUID, TEXT, TEXT) TO authenticated;

-- ========== 13) RLS ==========
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies: admin (profiles.role = 'admin') full access; others via current_user_has_admin_permission
DROP POLICY IF EXISTS "admin_roles_select" ON admin_roles;
CREATE POLICY "admin_roles_select" ON admin_roles FOR SELECT USING (current_user_has_admin_permission('governance', 'read'));
DROP POLICY IF EXISTS "admin_roles_all" ON admin_roles;
CREATE POLICY "admin_roles_all" ON admin_roles FOR ALL USING (current_user_has_admin_permission('governance', 'configure')) WITH CHECK (current_user_has_admin_permission('governance', 'configure'));

DROP POLICY IF EXISTS "admin_permissions_select" ON admin_permissions;
CREATE POLICY "admin_permissions_select" ON admin_permissions FOR SELECT USING (current_user_has_admin_permission('governance', 'read'));
DROP POLICY IF EXISTS "admin_permissions_all" ON admin_permissions;
CREATE POLICY "admin_permissions_all" ON admin_permissions FOR ALL USING (current_user_has_admin_permission('governance', 'configure')) WITH CHECK (current_user_has_admin_permission('governance', 'configure'));

DROP POLICY IF EXISTS "admin_role_permissions_select" ON admin_role_permissions;
CREATE POLICY "admin_role_permissions_select" ON admin_role_permissions FOR SELECT USING (current_user_has_admin_permission('governance', 'read'));
DROP POLICY IF EXISTS "admin_role_permissions_all" ON admin_role_permissions;
CREATE POLICY "admin_role_permissions_all" ON admin_role_permissions FOR ALL USING (current_user_has_admin_permission('governance', 'configure')) WITH CHECK (current_user_has_admin_permission('governance', 'configure'));

DROP POLICY IF EXISTS "admin_assignments_select" ON admin_user_role_assignments;
CREATE POLICY "admin_assignments_select" ON admin_user_role_assignments FOR SELECT USING (current_user_has_admin_permission('users', 'read') OR user_id = auth.uid());
DROP POLICY IF EXISTS "admin_assignments_all" ON admin_user_role_assignments;
CREATE POLICY "admin_assignments_all" ON admin_user_role_assignments FOR ALL USING (current_user_has_admin_permission('users', 'assign')) WITH CHECK (current_user_has_admin_permission('users', 'assign'));

DROP POLICY IF EXISTS "departments_select" ON departments;
CREATE POLICY "departments_select" ON departments FOR SELECT USING (current_user_has_admin_permission('organisations', 'read'));
DROP POLICY IF EXISTS "departments_all" ON departments;
CREATE POLICY "departments_all" ON departments FOR ALL USING (current_user_has_admin_permission('organisations', 'update')) WITH CHECK (current_user_has_admin_permission('organisations', 'update'));

DROP POLICY IF EXISTS "teams_select" ON teams;
CREATE POLICY "teams_select" ON teams FOR SELECT USING (current_user_has_admin_permission('organisations', 'read'));
DROP POLICY IF EXISTS "teams_all" ON teams;
CREATE POLICY "teams_all" ON teams FOR ALL USING (current_user_has_admin_permission('organisations', 'update')) WITH CHECK (current_user_has_admin_permission('organisations', 'update'));

DROP POLICY IF EXISTS "team_members_select" ON team_members;
CREATE POLICY "team_members_select" ON team_members FOR SELECT USING (current_user_has_admin_permission('organisations', 'read') OR user_id = auth.uid());
DROP POLICY IF EXISTS "team_members_all" ON team_members;
CREATE POLICY "team_members_all" ON team_members FOR ALL USING (current_user_has_admin_permission('users', 'assign')) WITH CHECK (current_user_has_admin_permission('users', 'assign'));

DROP POLICY IF EXISTS "admin_audit_select" ON admin_audit_logs;
CREATE POLICY "admin_audit_select" ON admin_audit_logs FOR SELECT USING (current_user_has_admin_permission('governance', 'read') OR current_user_has_admin_permission('governance', 'export'));
DROP POLICY IF EXISTS "admin_audit_insert" ON admin_audit_logs;
CREATE POLICY "admin_audit_insert" ON admin_audit_logs FOR INSERT WITH CHECK (actor_user_id = auth.uid() OR current_user_has_admin_permission('governance', 'create'));

-- ========== 14) Triggers updated_at (réutilise update_updated_at_column existant) ==========
DROP TRIGGER IF EXISTS trg_admin_roles_updated ON admin_roles;
CREATE TRIGGER trg_admin_roles_updated BEFORE UPDATE ON admin_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_admin_user_role_assignments_updated ON admin_user_role_assignments;
CREATE TRIGGER trg_admin_user_role_assignments_updated BEFORE UPDATE ON admin_user_role_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_departments_updated ON departments;
CREATE TRIGGER trg_departments_updated BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS trg_teams_updated ON teams;
CREATE TRIGGER trg_teams_updated BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
