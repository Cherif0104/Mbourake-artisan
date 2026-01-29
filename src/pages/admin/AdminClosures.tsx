import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Clock, User, DollarSign, Loader2, FileText, ArrowLeft } from 'lucide-react';
import { useToastContext } from '../../contexts/ToastContext';
import { supabase } from '../../lib/supabase';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { notifyArtisanPaymentReceived } from '../../lib/notificationService';

interface PendingClosure {
  id: string;
  title: string;
  project_number: string;
  client_confirmed_closure_at: string | null;
  client: { id: string; full_name: string; email: string } | null;
  artisan: { id: string; full_name: string } | null;
  escrow: { id: string; total_amount: number; artisan_payout: number; status: string } | null;
  category: { name: string } | null;
}

export function AdminClosures() {
  const { success, error: showError } = useToastContext();
  const [list, setList] = useState<PendingClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [closingId, setClosingId] = useState<string | null>(null);

  const fetchList = async () => {
    setLoading(true);
    const { data: projects, error } = await supabase
      .from('projects')
      .select(`
        id, title, project_number, client_confirmed_closure_at,
        categories (name),
        profiles!projects_client_id_fkey (id, full_name, email)
      `)
      .eq('status', 'completion_requested')
      .not('client_confirmed_closure_at', 'is', null)
      .order('client_confirmed_closure_at', { ascending: false }) as { data: any[]; error: any };

    if (error) {
      console.error('Error fetching pending closures:', error);
      setLoading(false);
      return;
    }

    const enriched = await Promise.all(
      (projects || []).map(async (p: any) => {
        const { data: quote } = await supabase
          .from('quotes')
          .select('artisan_id, profiles!quotes_artisan_id_fkey(id, full_name)')
          .eq('project_id', p.id)
          .eq('status', 'accepted')
          .single() as { data: any };
        const { data: escrow } = await supabase
          .from('escrows')
          .select('id, total_amount, artisan_payout, status')
          .eq('project_id', p.id)
          .single();
        return {
          id: p.id,
          title: p.title,
          project_number: p.project_number,
          client_confirmed_closure_at: p.client_confirmed_closure_at,
          client: p.profiles ?? null,
          artisan: quote?.profiles ?? null,
          escrow: escrow ?? null,
          category: p.categories ?? null,
        };
      })
    );

    setList(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleCloseAndPay = async (row: PendingClosure) => {
    if (!row.escrow || row.escrow.status === 'released') {
      showError('Escrow invalide ou déjà libéré');
      return;
    }
    setClosingId(row.id);
    try {
      await supabase
        .from('escrows')
        .update({ status: 'released', updated_at: new Date().toISOString() })
        .eq('id', row.escrow.id);

      await supabase
        .from('projects')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', row.id);

      const reliquat = (row.escrow.artisan_payout || 0);
      if (row.artisan?.id && reliquat > 0) {
        await notifyArtisanPaymentReceived(row.id, row.artisan.id, reliquat);
      }

      await supabase.from('notifications').insert({
        user_id: row.client?.id,
        type: 'project_completed',
        title: 'Projet clôturé',
        message: `Le projet "${row.title}" a été clôturé. Vous pouvez maintenant noter l'artisan.`,
        data: { project_id: row.id },
        is_read: false,
      });

      success(`Projet "${row.title}" clôturé. Paiement versé à l'artisan.`);
      await fetchList();
    } catch (err: any) {
      showError(err?.message || 'Erreur lors de la clôture');
    } finally {
      setClosingId(null);
    }
  };

  if (loading) return <LoadingOverlay />;

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
          <CheckCircle size={24} className="text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-black text-gray-900">Clôtures en attente</h1>
          <p className="text-sm text-gray-500">Projets dont le client a confirmé la fin des travaux. Clôturer et verser l&apos;artisan.</p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
          <Clock size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-700">Aucune clôture en attente</p>
          <p className="text-sm text-gray-500 mt-1">Les demandes de clôture confirmées par le client apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((row) => (
            <div
              key={row.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-gray-400">{row.project_number}</span>
                  {row.category && (
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                      {row.category.name}
                    </span>
                  )}
                </div>
                <h2 className="font-bold text-gray-900 mt-1 truncate">{row.title}</h2>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <User size={14} />
                    {row.client?.full_name ?? '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText size={14} />
                    Artisan : {row.artisan?.full_name ?? '—'}
                  </span>
                  {row.escrow && (
                    <span className="flex items-center gap-1 font-medium">
                      <DollarSign size={14} />
                      Reliquat : {(row.escrow.artisan_payout || 0).toLocaleString('fr-FR')} FCFA
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={() => handleCloseAndPay(row)}
                  disabled={closingId === row.id || row.escrow?.status === 'released'}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {closingId === row.id ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <CheckCircle size={18} />
                  )}
                  Clôturer et payer l&apos;artisan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
