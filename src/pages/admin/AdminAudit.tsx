import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingOverlay } from '../../components/LoadingOverlay';

interface AuditEntry {
  id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

export function AdminAudit() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('id, actor_user_id, action, entity_type, entity_id, reason, old_data, new_data, created_at')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) {
        setEntries([]);
      } else {
        setEntries((data as AuditEntry[]) || []);
      }
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingOverlay />;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
          <FileText size={20} className="text-gray-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">Journal d&apos;audit</h1>
          <p className="text-sm text-gray-500">Actions sensibles réalisées dans le panel admin</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-600 font-semibold">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entité</th>
                <th className="px-4 py-3">ID entité</th>
                <th className="px-4 py-3">Acteur</th>
                <th className="px-4 py-3">Détails</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Aucune entrée pour le moment.
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 font-medium">{e.action}</td>
                    <td className="px-4 py-3 text-gray-700">{e.entity_type}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 truncate max-w-[120px]" title={e.entity_id ?? ''}>
                      {e.entity_id ? `${e.entity_id.slice(0, 8)}…` : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 truncate max-w-[120px]" title={e.actor_user_id ?? ''}>
                      {e.actor_user_id ? `${e.actor_user_id.slice(0, 8)}…` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px]">
                      {e.reason && <span className="block truncate" title={e.reason}>{e.reason}</span>}
                      {e.old_data && Object.keys(e.old_data).length > 0 && (
                        <span className="block text-xs text-amber-700">Ancien: {JSON.stringify(e.old_data)}</span>
                      )}
                      {e.new_data && Object.keys(e.new_data).length > 0 && (
                        <span className="block text-xs text-green-700">Nouveau: {JSON.stringify(e.new_data)}</span>
                      )}
                      {!e.reason && (!e.old_data || Object.keys(e.old_data).length === 0) && (!e.new_data || Object.keys(e.new_data).length === 0) && '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
