import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingBag, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '@shared';
import { useProfile } from '../hooks/useProfile';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { HomeButton } from '../components/HomeButton';
import { useToastContext } from '../contexts/ToastContext';

type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];

type OrderWithDetails = OrderRow & {
  order_items?: (OrderItemRow & { products?: { title: string } | null })[];
  buyer?: { id: string; full_name: string | null; phone: string | null } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

const NEXT_STATUS: Record<string, string | null> = {
  pending: 'confirmed',
  confirmed: 'shipped',
  shipped: 'delivered',
  delivered: null,
  cancelled: null,
};

export function MyShopOrdersPage() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { success, error: showError } = useToastContext();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [tableUnavailable, setTableUnavailable] = useState(false);

  const isArtisan = profile?.role === 'artisan';

  useEffect(() => {
    if (!profile?.id || !isArtisan) {
      setLoading(false);
      return;
    }
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(
            `
            *,
            profiles!orders_buyer_id_fkey ( id, full_name, phone )
          `
          )
          .eq('seller_id', profile.id)
          .order('created_at', { ascending: false });

        if (ordersError) {
          const msg = (ordersError.message || '').toLowerCase();
          if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('42p01')) {
            setTableUnavailable(true);
          }
          setOrders([]);
          setLoading(false);
          return;
        }

        const list = (ordersData as (OrderRow & { profiles?: { id: string; full_name: string | null; phone: string | null } | null })[]) ?? [];
        const withItems: OrderWithDetails[] = await Promise.all(
          list.map(async (o) => {
            const { data: items } = await supabase
              .from('order_items')
              .select('*, products(title)')
              .eq('order_id', o.id);
            return {
              ...o,
              order_items: items as OrderWithDetails['order_items'],
              buyer: o.profiles ?? null,
            };
          })
        );
        setOrders(withItems);
        setTableUnavailable(false);
      } catch {
        setOrders([]);
        setTableUnavailable(true);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [profile?.id, isArtisan]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('seller_id', profile?.id ?? '');

      if (error) throw error;
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      success('Statut mis à jour.');
    } catch (e: any) {
      showError(e?.message ?? 'Erreur');
    } finally {
      setUpdatingId(null);
    }
  };

  if (profileLoading || loading) {
    return <LoadingOverlay message="Chargement des commandes..." />;
  }

  if (!profile || !isArtisan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <h1 className="text-lg font-black text-gray-900 mb-2">Accès réservé aux artisans</h1>
          <p className="text-sm text-gray-600 mb-4">
            Seuls les artisans peuvent voir les commandes de leur boutique.
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <HomeButton />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">Commandes boutique</h1>
          <p className="text-xs text-gray-400">Commandes reçues sur votre boutique</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        {tableUnavailable ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-500">
            <Package size={40} className="mx-auto mb-3 text-gray-300" />
            <p>Les commandes ne sont pas encore disponibles.</p>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-bold"
            >
              Retour au tableau de bord
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-500">
            <ShoppingBag size={40} className="mx-auto mb-3 text-gray-300" />
            <p>Aucune commande reçue pour le moment.</p>
            <button
              type="button"
              onClick={() => navigate('/my-products')}
              className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-bold"
            >
              Ma boutique
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => {
              const primaryItem = order.order_items?.[0];
              const title = primaryItem?.products?.title ?? 'Commande';
              const statusLabel = STATUS_LABELS[order.status] ?? order.status;
              const nextStatus = NEXT_STATUS[order.status];
              return (
                <li key={order.id}>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-bold text-gray-900 truncate">{title}</p>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          order.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : order.status === 'delivered'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'cancelled'
                                ? 'bg-gray-100 text-gray-600'
                                : 'bg-brand-50 text-brand-700'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {order.order_items && order.order_items.length > 1
                        ? `${order.order_items.length} articles`
                        : '1 article'}
                      {' · '}
                      {Number(order.total_amount).toLocaleString('fr-FR')} FCFA
                    </p>
                    {order.buyer?.full_name && (
                      <p className="text-xs text-gray-600 mt-1">
                        Client : {order.buyer.full_name}
                        {order.buyer.phone && ` · ${order.buyer.phone}`}
                      </p>
                    )}
                    {nextStatus && (
                      <button
                        type="button"
                        disabled={updatingId === order.id}
                        onClick={() => handleUpdateStatus(order.id, nextStatus)}
                        className="mt-3 w-full rounded-xl bg-brand-500 text-white text-sm font-bold py-2.5 disabled:opacity-60"
                      >
                        {updatingId === order.id
                          ? 'Mise à jour...'
                          : nextStatus === 'confirmed'
                            ? 'Confirmer la commande'
                            : nextStatus === 'shipped'
                              ? 'Marquer expédiée'
                              : 'Marquer livrée'}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
