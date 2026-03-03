import { supabase } from './supabase';

export type AdminAuditParams = {
  action: string;
  entity_type: string;
  entity_id?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  reason?: string | null;
};

/** Enregistre une action admin dans admin_audit_logs (fire-and-forget, n’affecte pas l’UI). */
export async function logAdminAudit(params: AdminAuditParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('admin_audit_logs').insert({
      actor_user_id: user.id,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id ?? null,
      old_data: params.old_data ?? null,
      new_data: params.new_data ?? null,
      reason: params.reason ?? null,
      metadata: {},
    });
  } catch {
    // Ne pas bloquer l’UI en cas d’échec d’écriture audit
  }
}
