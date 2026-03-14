import React, { useCallback, useEffect, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingOverlay } from '../../components/LoadingOverlay';
import { useToastContext } from '../../contexts/ToastContext';

interface OrderEscrowRow {
  id: string;
  status: string;
  total_amount: number;
  artisan_payout: number | null;
  platform_commission: number | null;
  released_at: string | null;
}

interface OrderRow {
  id: string;
  total_amount: number;
  status: string;
  payment_mode: string;
  created_at: string;
  buyer_id: string;
  seller_id: string;
  buyer?: { full_name: string | null } | null;
  seller?: { full_name: string | null } | null;
  order_escrows?: OrderEscrowRow[] | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

const PAYMENT_MODE_LABELS: Record<string, string> = {
  on_delivery: 'À la livraison',
  escrow: 'Séquestration',
  relay: 'Relay',
};

const ESCROW_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente paiement',
  held: 'Bloqué',
  released: 'Débloqué',
  refunded: 'Remboursé',
  frozen: 'Gelé',
};

export function AdminCommandes() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const { success, error: showError } = useToastContext();

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, err } = await supabase
      .from('orders')
      .select(`
        id, total_amount, status, payment_mode, created_at, buyer_id, seller_id,
        buyer:profiles!orders_buyer_id_fkey(full_name),
        seller:profiles!orders_seller_id_fkey(full_name),
        order_escrows(id, status, total_amount, artisan_payout, platform_commission, released_at)
      `)
      .order('created_at', { ascending: false });
    if (!err && data) setOrders((data ?? []) as OrderRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const runRpc = useCallback(
    async (rpcName: string, orderId: string, successMessage: string) => {
      setActionOrderId(orderId);
      const { error } = await supabase.rpc(rpcName as 'release_order_escrow' | 'refund_order_escrow' | 'freeze_order_escrow' | 'unfreeze_order_escrow' | 'mark_order_escrow_paid', {
        p_order_id: orderId,
      });
      setActionOrderId(null);
      if (error) {
        showError(error.message || `Erreur ${rpcName}`);
        return;
      }
      success(successMessage);
      fetchOrders();
    },
    [fetchOrders, success, showError]
  );

  const runMarkPaid = useCallback(
    async (orderId: string, ref?: string) => {
      setActionOrderId(orderId);
      const { error } = await supabase.rpc('mark_order_escrow_paid', {
        p_order_id: orderId,
        p_transaction_reference: ref || null,
      });
      setActionOrderId(null);
      if (error) {
        showError(error.message || 'Erreur marquer payé');
        return;
      }
      success('Escrow marqué comme payé.');
      fetchOrders();
    },
    [fetchOrders, success, showError]
  );

  const filtered = orders.filter((o) => {
    const buyer = o.buyer?.full_name ?? '';
    const seller = o.seller?.full_name ?? '';
    const matchSearch =
      buyer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const escrow = (o: OrderRow): OrderEscrowRow | null =>
    o.order_escrows && o.order_escrows.length > 0 ? o.order_escrows[0] : null;

  if (loading) return <LoadingOverlay />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher (acheteur, vendeur, ID)..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none font-medium"
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              Aucune commande trouvée
            </div>
          ) : (
            filtered.map((o) => {
              const e = escrow(o);
              const busy = actionOrderId === o.id;
              return (
                <div key={o.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-wrap items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-gray-100 text-gray-700">
                        {STATUS_LABELS[o.status] ?? o.status}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-sky-50 text-sky-700">
                        {PAYMENT_MODE_LABELS[o.payment_mode] ?? o.payment_mode}
                      </span>
                      {e && (
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-medium ${
                            e.status === 'released'
                              ? 'bg-green-50 text-green-700'
                              : e.status === 'refunded'
                                ? 'bg-amber-50 text-amber-700'
                                : e.status === 'frozen'
                                  ? 'bg-red-50 text-red-700'
                                  : e.status === 'held'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {ESCROW_STATUS_LABELS[e.status] ?? e.status}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-mono truncate">{o.id}</p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      Acheteur: {o.buyer?.full_name ?? '—'} · Vendeur: {o.seller?.full_name ?? '—'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(o.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <p className="font-bold text-brand-600">
                      {Number(o.total_amount || 0).toLocaleString('fr-FR')} FCFA
                    </p>
                    {e && (
                      <div className="flex flex-wrap gap-1">
                        {e.status === 'held' && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => runRpc('release_order_escrow', o.id, 'Escrow débloqué.')}
                              className="px-2 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50"
                            >
                              {busy ? <Loader2 className="animate-spin inline" size={14} /> : 'Débloquer'}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => runRpc('refund_order_escrow', o.id, 'Escrow remboursé.')}
                              className="px-2 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                            >
                              Rembourser
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => runRpc('freeze_order_escrow', o.id, 'Escrow gelé.')}
                              className="px-2 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50"
                            >
                              Geler
                            </button>
                          </>
                        )}
                        {e.status === 'frozen' && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => runRpc('unfreeze_order_escrow', o.id, 'Escrow dégelé.')}
                            className="px-2 py-1 rounded-lg text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-50"
                          >
                            {busy ? <Loader2 className="animate-spin inline" size={14} /> : 'Dégeler'}
                          </button>
                        )}
                        {e.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => runMarkPaid(o.id)}
                              className="px-2 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50"
                            >
                              {busy ? <Loader2 className="animate-spin inline" size={14} /> : 'Marquer payé'}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => runRpc('refund_order_escrow', o.id, 'Escrow remboursé.')}
                              className="px-2 py-1 rounded-lg text-xs font-medium bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                            >
                              Rembourser
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
