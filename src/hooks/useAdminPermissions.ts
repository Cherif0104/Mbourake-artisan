import { useMemo, useState, useEffect } from 'react';
import { useProfile } from './useProfile';
import { supabase } from '../lib/supabase';

type PermissionKey = `${string}:${string}`;
const PRELOAD: { module: string; action: string }[] = [
  { module: 'governance', action: 'read' },
  { module: 'users', action: 'read' },
  { module: 'users', action: 'update' },
  { module: 'users', action: 'assign' },
  { module: 'users', action: 'delete' },
  { module: 'organisations', action: 'read' },
  { module: 'organisations', action: 'update' },
  { module: 'bi', action: 'read' },
  { module: 'bi', action: 'export' },
  { module: 'finance', action: 'read' },
  { module: 'training', action: 'read' },
];

export function useAdminPermissions() {
  const { profile } = useProfile();
  const [permissions, setPermissions] = useState<Record<PermissionKey, boolean>>({} as Record<PermissionKey, boolean>);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) {
      setLoading(false);
      return;
    }
    if (profile.role === 'admin') {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        PRELOAD.map(async ({ module, action }) => {
          const { data, error } = await supabase.rpc('current_user_has_admin_permission', {
            p_module: module,
            p_action: action,
          });
          const key: PermissionKey = `${module}:${action}`;
          return [key, !error && data === true] as const;
        })
      );
      if (cancelled) return;
      setPermissions(Object.fromEntries(entries) as Record<PermissionKey, boolean>);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profile?.id, profile?.role]);

  const can = useMemo(() => {
    return (module: string, action: string, _scope?: string): boolean => {
      if (profile?.role === 'admin') return true;
      const key: PermissionKey = `${module}:${action}`;
      return permissions[key] === true;
    };
  }, [profile?.role, permissions]);

  const isAdmin = profile?.role === 'admin' || permissions['governance:read'] === true;

  return { can, loading, isAdmin };
}
