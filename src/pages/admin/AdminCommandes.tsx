import React, { useEffect, useState } from 'react';
import { Search, ShoppingBag, User, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingOverlay } from '../../components/LoadingOverlay';

interface OrderRow {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  buyer_id: string;
  seller_id: string;
  buyer?: { full_name: string | null } | null;
  seller?: { full_name: string | null } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export function AdminCommandes() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, total_amount, status, created_at, buyer_id, seller_id,
          buyer:profiles!orders_buyer_id_fkey(full_name),
          seller:profiles!orders_seller_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });
      if (!error && data) setOrders(data as OrderRow[]);
      setLoading(false);
    };
    fetchOrders();
  }, []);

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
            filtered.map((o) => (
              <div key={o.id} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-gray-100 text-gray-700">
                      {STATUS_LABELS[o.status] ?? o.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono truncate">{o.id}</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    Acheteur: {o.buyer?.full_name ?? '—'} · Vendeur: {o.seller?.full_name ?? '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(o.created_at).toLocaleString('fr-FR')}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-brand-600">{Number(o.total_amount || 0).toLocaleString('fr-FR')} FCFA</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
