import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Package, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '@shared';
import { useProfile } from '../hooks/useProfile';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { HomeButton } from '../components/HomeButton';
import { useToastContext } from '../contexts/ToastContext';

type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];

type OrderAsBuyer = OrderRow & {
  order_items?: (OrderItemRow & { products?: { title: string; images: Json | null } | null })[];
  seller?: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

type OrderAsSeller = OrderRow & {
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

type TabId = 'achats' | 'recues';

export function CommandesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile, loading: profileLoading } = useProfile();
  const { success, error: showError } = useToastContext();

  const tabParam = searchParams.get('tab');
  const isArtisan = profile?.role === 'artisan';
  const defaultTab: TabId = isArtisan && tabParam === 'recues' ? 'recues' : 'achats';
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  const [ordersAchats, setOrdersAchats] = useState<OrderAsBuyer[]>([]);
  const [ordersRecues, setOrdersRecues] = useState<OrderAsSeller[]>([]);
  const [loadingAchats, setLoadingAchats] = useState(true);
  const [loadingRecues, setLoadingRecues] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'recues' && isArtisan) setActiveTab('recues');
    else setActiveTab('achats');
  }, [searchParams, isArtisan]);

  useEffect(() => {
    const fetchAchats = async () => {
      setLoadingAchats(true);
      try {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        if (!userId) {
          setOrdersAchats([]);
          setLoadingAchats(false);
          return;
        }
        const { data, error } = await supabase
          .from('orders')
          .select('*, profiles!orders_seller_id_fkey(id, full_name, avatar_url)')
          .eq('buyer_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('42p01')) setUnavailable(true);
          setOrdersAchats([]);
          setLoadingAchats(false);
          return;
        }

        const list = (data as (OrderRow & { profiles?: { id: string; full_name: string | null; avatar_url: string | null } | null })[]) ?? [];
        const withItems: OrderAsBuyer[] = await Promise.all(
          list.map(async (o) => {
            const { data: items } = await supabase.from('order_items').select('*, products(title, images)').eq('order_id', o.id);
            return { ...o, order_items: items as OrderAsBuyer['order_items'], seller: o.profiles ?? null };
          })
        );
        setOrdersAchats(withItems);
        setUnavailable(false);
      } catch {
        setOrdersAchats([]);
        setUnavailable(true);
      } finally {
        setLoadingAchats(false);
      }
    };
    fetchAchats();
  }, []);

  useEffect(() => {
    if (!profile?.id || !isArtisan) {
      setLoadingRecues(false);
      return;
    }
    const fetchRecues = async () => {
      setLoadingRecues(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, profiles!orders_buyer_id_fkey(id, full_name, phone)')
          .eq('seller_id', profile.id)
          .order('created_at', { ascending: false });

        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('42p01')) setUnavailable(true);
          setOrdersRecues([]);
          setLoadingRecues(false);
          return;
        }

        const list = (data as (OrderRow & { profiles?: { id: string; full_name: string | null; phone: string | null } | null })[]) ?? [];
        const withItems: OrderAsSeller[] = await Promise.all(
          list.map(async (o) => {
            const { data: items } = await supabase.from('order_items').select('*, products(title)').eq('order_id', o.id);
            return { ...o, order_items: items as OrderAsSeller['order_items'], buyer: o.profiles ?? null };
          })
        );
        setOrdersRecues(withItems);
        setUnavailable(false);
      } catch {
        setOrdersRecues([]);
        setUnavailable(true);
      } finally {
        setLoadingRecues(false);
      }
    };
    fetchRecues();
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
      setOrdersRecues((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
      success('Statut mis à jour.');
    } catch (e: any) {
      showError(e?.message ?? 'Erreur');
    } finally {
      setUpdatingId(null);
    }
  };

  const setTab = (tab: TabId) => {
    setActiveTab(tab);
    setSearchParams(tab === 'recues' ? { tab: 'recues' } : {}, { replace: true });
  };

  if (profileLoading) return <LoadingOverlay message="Chargement..." />;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'achats', label: 'Ce que j\'ai commandé' },
    ...(isArtisan ? [{ id: 'recues' as TabId, label: 'Ce qui m\'a été commandé' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="sticky top-0 z-40 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <HomeButton />
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">Commandes</h1>
          <p className="text-xs text-gray-400">
            {isArtisan ? 'Vos achats et les commandes sur votre boutique' : 'Vos achats sur le marketplace'}
          </p>
        </div>
      </header>

      {tabs.length > 1 && (
        <div className="bg-white border-b border-gray-100 px-4">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={`flex-1 py-3 text-sm font-semibold rounded-t-xl transition-colors ${
                  activeTab === tab.id ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-lg mx-auto px-4 py-6">
        {activeTab === 'achats' && (
          <>
            {loadingAchats ? (
              <LoadingOverlay message="Chargement de vos achats..." />
            ) : unavailable ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-500">
                <Package size={40} className="mx-auto mb-3 text-gray-300" />
                <p>Les commandes ne sont pas encore disponibles.</p>
                <button type="button" onClick={() => navigate('/dashboard')} className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-bold">
                  Retour au tableau de bord
                </button>
              </div>
            ) : ordersAchats.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-500">
                <ShoppingBag size={40} className="mx-auto mb-3 text-gray-300" />
                <p>Vous n’avez pas encore passé de commande.</p>
                <button type="button" onClick={() => navigate('/marketplace')} className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-bold">
                  Découvrir le marché
                </button>
              </div>
            ) : (
              <ul className="space-y-3">
                {ordersAchats.map((order) => {
                  const primaryItem = order.order_items?.[0];
                  const title = primaryItem?.products?.title ?? 'Commande';
                  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
                  return (
                    <li key={order.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="w-full bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm text-left hover:border-brand-100 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Package size={22} className="text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 truncate">{title}</p>
                          <p className="text-xs text-gray-500">
                            {order.order_items && order.order_items.length > 1 ? `${order.order_items.length} articles` : '1 article'}
                            {' · '}
                            {Number(order.total_amount).toLocaleString('fr-FR')} FCFA
                          </p>
                          <p className="text-[11px] font-medium text-brand-600 mt-0.5">
                            {statusLabel}
                            {order.seller?.full_name && ` · ${order.seller.full_name}`}
                          </p>
                        </div>
                        <ChevronRight size={20} className="text-gray-400 flex-shrink-0" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}

        {activeTab === 'recues' && isArtisan && (
          <>
            {loadingRecues ? (
              <LoadingOverlay message="Chargement des commandes reçues..." />
            ) : unavailable ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-500">
                <Package size={40} className="mx-auto mb-3 text-gray-300" />
                <p>Les commandes ne sont pas encore disponibles.</p>
                <button type="button" onClick={() => navigate('/dashboard')} className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-bold">
                  Retour au tableau de bord
                </button>
              </div>
            ) : ordersRecues.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-500">
                <ShoppingBag size={40} className="mx-auto mb-3 text-gray-300" />
                <p>Aucune commande reçue pour le moment.</p>
                <button type="button" onClick={() => navigate('/my-products')} className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-xl text-sm font-bold">
                  Ma boutique
                </button>
              </div>
            ) : (
              <ul className="space-y-3">
                {ordersRecues.map((order) => {
                  const primaryItem = order.order_items?.[0];
                  const title = primaryItem?.products?.title ?? 'Commande';
                  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
                  const nextStatus = NEXT_STATUS[order.status];
                  return (
                    <li key={order.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate(`/orders/${order.id}`)}
                        onKeyDown={(e) => e.key === 'Enter' && navigate(`/orders/${order.id}`)}
                        className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm cursor-pointer hover:border-brand-100 transition-colors"
                      >
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
                          {order.order_items && order.order_items.length > 1 ? `${order.order_items.length} articles` : '1 article'}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(order.id, nextStatus);
                            }}
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
          </>
        )}
      </main>
    </div>
  );
}
