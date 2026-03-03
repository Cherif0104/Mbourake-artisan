-- Recette Sprint 1: permission manquante pour les politiques RLS (admin_roles, admin_permissions, admin_role_permissions)
-- Les politiques utilisent current_user_has_admin_permission('governance', 'configure') ; la permission n'était pas seedée.
INSERT INTO admin_permissions (module, action) VALUES ('governance', 'configure')
ON CONFLICT (module, action) DO NOTHING;
