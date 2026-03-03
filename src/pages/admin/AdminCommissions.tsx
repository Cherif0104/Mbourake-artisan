import React, { useEffect, useState } from 'react';
import { DollarSign, FileText, ShieldOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingOverlay } from '../../components/LoadingOverlay';

type TabId = 'rules' | 'ledger' | 'exemptions';

interface CommissionRule {
  id: string;
  code: string | null;
  name: string;
  scope_type: string;
  scope_id: string | null;
  rule_type: string;
  value: number;
  applicable_to: string;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
}

interface CommissionLedgerEntry {
  id: string;
  source_type: string;
  source_id: string;
  amount_base: number;
  amount_commission: number;
  organisation_id: string | null;
  project_id: string | null;
  created_at: string;
}

interface ExemptionRule {
  id: string;
  entity_type: string;
  entity_id: string | null;
  category_id: number | null;
  reason: string | null;
  valid_from: string;
  valid_to: string | null;
  is_active: boolean;
}

export function AdminCommissions() {
  const [tab, setTab] = useState<TabId>('rules');
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [ledger, setLedger] = useState<CommissionLedgerEntry[]>([]);
  const [exemptions, setExemptions] = useState<ExemptionRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [rulesRes, ledgerRes, exemptionsRes] = await Promise.all([
        supabase.from('commission_rules').select('id, code, name, scope_type, scope_id, rule_type, value, applicable_to, valid_from, valid_to, is_active').order('valid_from', { ascending: false }),
        supabase.from('commission_ledger').select('id, source_type, source_id, amount_base, amount_commission, organisation_id, project_id, created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('exemption_rules').select('id, entity_type, entity_id, category_id, reason, valid_from, valid_to, is_active').order('valid_from', { ascending: false }),
      ]);
      if (!rulesRes.error) setRules((rulesRes.data as CommissionRule[]) || []);
      if (!ledgerRes.error) setLedger((ledgerRes.data as CommissionLedgerEntry[]) || []);
      if (!exemptionsRes.error) setExemptions((exemptionsRes.data as ExemptionRule[]) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingOverlay />;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'rules', label: 'Règles de commission' },
    { id: 'ledger', label: 'Journal (ledger)' },
    { id: 'exemptions', label: 'Exemptions' },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
          <DollarSign size={20} className="text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">Commissions & exemptions</h1>
          <p className="text-sm text-gray-500">Règles, journal des commissions et exemptions (Sprint 3)</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`pb-3 px-1 font-bold text-sm border-b-2 transition-colors ${tab === t.id ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'rules' && (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-600 font-semibold">
                  <th className="px-4 py-3">Nom / Code</th>
                  <th className="px-4 py-3">Scope</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Valeur</th>
                  <th className="px-4 py-3">Applicable à</th>
                  <th className="px-4 py-3">Valide</th>
                  <th className="px-4 py-3">Actif</th>
                </tr>
              </thead>
              <tbody>
                {rules.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Aucune règle.</td></tr>
                ) : (
                  rules.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3"><span className="font-medium">{r.name}</span>{r.code && <span className="block text-xs text-gray-500">{r.code}</span>}</td>
                      <td className="px-4 py-3">{r.scope_type}{r.scope_id ? ` · ${r.scope_id.slice(0, 8)}…` : ''}</td>
                      <td className="px-4 py-3">{r.rule_type}</td>
                      <td className="px-4 py-3">{r.rule_type === 'percent' ? `${Number(r.value)} %` : `${Number(r.value)} FCFA`}</td>
                      <td className="px-4 py-3">{r.applicable_to}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(r.valid_from).toLocaleDateString('fr-FR')}{r.valid_to ? ` → ${new Date(r.valid_to).toLocaleDateString('fr-FR')}` : ''}</td>
                      <td className="px-4 py-3">{r.is_active ? 'Oui' : 'Non'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'ledger' && (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-600 font-semibold">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Montant base</th>
                  <th className="px-4 py-3">Commission</th>
                  <th className="px-4 py-3">Organisation</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Aucune entrée. Le journal se remplit lors des clôtures escrow ou commandes.</td></tr>
                ) : (
                  ledger.map((e) => (
                    <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-600">{new Date(e.created_at).toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-3 font-mono text-xs">{e.source_type} · {e.source_id.slice(0, 8)}…</td>
                      <td className="px-4 py-3">{Number(e.amount_base).toLocaleString('fr-FR')} FCFA</td>
                      <td className="px-4 py-3 font-medium text-green-700">{Number(e.amount_commission).toLocaleString('fr-FR')} FCFA</td>
                      <td className="px-4 py-3 text-gray-500">{e.organisation_id ? `${e.organisation_id.slice(0, 8)}…` : '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'exemptions' && (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-600 font-semibold">
                  <th className="px-4 py-3">Entité</th>
                  <th className="px-4 py-3">ID / Catégorie</th>
                  <th className="px-4 py-3">Motif</th>
                  <th className="px-4 py-3">Valide</th>
                  <th className="px-4 py-3">Actif</th>
                </tr>
              </thead>
              <tbody>
                {exemptions.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Aucune exemption.</td></tr>
                ) : (
                  exemptions.map((ex) => (
                    <tr key={ex.id} className="border-b last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3">{ex.entity_type}</td>
                      <td className="px-4 py-3 font-mono text-xs">{ex.entity_id ? `${ex.entity_id.slice(0, 8)}…` : ex.category_id != null ? `Cat. ${ex.category_id}` : '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{ex.reason || '—'}</td>
                      <td className="px-4 py-3">{new Date(ex.valid_from).toLocaleDateString('fr-FR')}{ex.valid_to ? ` → ${new Date(ex.valid_to).toLocaleDateString('fr-FR')}` : ''}</td>
                      <td className="px-4 py-3">{ex.is_active ? 'Oui' : 'Non'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
