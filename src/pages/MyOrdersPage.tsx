import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Package, ChevronRight } from 'lucide-react';
import { HomeButton } from '../components/HomeButton';
import { supabase } from '../lib/supabase';
import type { Database } from '@shared';
import { LoadingOverlay } from '../components/LoadingOverlay';

type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];

type OrderWithDetails = OrderRow & {
  order_items?: (OrderItemRow & { products?: { title: string; images: Json | null } | null })[];
  seller?: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export function MyOrdersPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [tableUnavailable, setTableUnavailable] = useState(false);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(
            `
            *,
            profiles!orders_seller_id_fkey ( id, full_name, avatar_url )
          `
          )
          .eq('buyer_id', (await supabase.auth.getUser()).data.user?.id ?? '')
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

        const list = (ordersData as (OrderRow & { profiles?: { id: string; full_name: string | null; avatar_url: string | null } | null })[]) ?? [];
        const withItems: OrderWithDetails[] = await Promise.all(
          list.map(async (o) => {
            const { data: items } = await supabase
              .from('order_items')
              .select('*, products(title, images)')
              .eq('order_id', o.id);
            return {
              ...o,
              order_items: items as OrderWithDetails['order_items'],
              seller: o.profiles ?? null,
            };
          })
        );
        setOrders(withItems);
        setTableUnavailable(false);
      } catch (e) {
        setOrders([]);
        setTableUnavailable(true);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) return <LoadingOverlay message="Chargement de vos commandes..." />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <HomeButton />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">Mes commandes</h1>
          <p className="text-xs text-gray-400">Vos achats sur le marketplace</p>
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
            <p>Aucune commande pour le moment.</p>
            <button
              type="button"
              onClick={() => navigate('/marketplace')}
              className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-bold"
            >
              Découvrir le marketplace
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((order) => {
              const primaryItem = order.order_items?.[0];
              const title = primaryItem?.products?.title ?? 'Commande';
              const statusLabel = STATUS_LABELS[order.status] ?? order.status;
              return (
                <li key={order.id}>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Package size={22} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{title}</p>
                      <p className="text-xs text-gray-500">
                        {order.order_items && order.order_items.length > 1
                          ? `${order.order_items.length} articles`
                          : '1 article'}
                        {' · '}
                        {Number(order.total_amount).toLocaleString('fr-FR')} FCFA
                      </p>
                      <p className="text-[11px] font-medium text-brand-600 mt-0.5">
                        {statusLabel}
                        {order.seller?.full_name && ` · ${order.seller.full_name}`}
                      </p>
                    </div>
                    <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
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
