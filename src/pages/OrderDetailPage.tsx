import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Phone,
  User,
  MapPin,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '@shared';
import { useProfile } from '../hooks/useProfile';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { HomeButton } from '../components/HomeButton';
import { useToastContext } from '../contexts/ToastContext';

type OrderRow = Database['public']['Tables']['orders']['Row'];
type OrderItemRow = Database['public']['Tables']['order_items']['Row'];

type OrderWithDetails = OrderRow & {
  order_items?: (OrderItemRow & {
    products?: { title: string; images: Json | null } | null;
  })[];
  buyer?: { id: string; full_name: string | null; phone: string | null } | null;
  seller?: { id: string; full_name: string | null; avatar_url: string | null } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

const STATUS_SUBTITLE: Record<string, string> = {
  delivered: 'Vente clôturée',
  cancelled: 'Commande annulée',
};

const NEXT_STATUS: Record<string, string | null> = {
  pending: 'confirmed',
  confirmed: 'shipped',
  shipped: 'delivered',
  delivered: null,
  cancelled: null,
};

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { success, error: showError } = useToastContext();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderWithDetails | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [updating, setUpdating] = useState(false);

  const isBuyer = order && profile && order.buyer_id === profile.id;
  const isSeller = order && profile && order.seller_id === profile.id;
  const canUpdateStatus = isSeller;
  const nextStatus = order ? NEXT_STATUS[order.status] : null;

  useEffect(() => {
    if (!orderId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const { data: orderData, error } = await supabase
          .from('orders')
          .select(
            `
            *,
            buyer:profiles!orders_buyer_id_fkey ( id, full_name, phone ),
            seller:profiles!orders_seller_id_fkey ( id, full_name, avatar_url )
          `
          )
          .eq('id', orderId)
          .maybeSingle();

        if (error || !orderData) {
          setNotFound(true);
          setOrder(null);
          setLoading(false);
          return;
        }

        const { data: items } = await supabase
          .from('order_items')
          .select('*, products(title, images)')
          .eq('order_id', orderId);

        const o = orderData as OrderRow & {
          buyer?: { id: string; full_name: string | null; phone: string | null } | null;
          seller?: { id: string; full_name: string | null; avatar_url: string | null } | null;
        };

        setOrder({
          ...(orderData as OrderRow),
          order_items: items as OrderWithDetails['order_items'],
          buyer: o.buyer ?? null,
          seller: o.seller ?? null,
        });
        setNotFound(false);
      } catch {
        setNotFound(true);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const handleUpdateStatus = async (newStatus: string) => {
    if (!orderId || !canUpdateStatus) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId)
        .eq('seller_id', profile?.id ?? '');

      if (error) throw error;
      setOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
      success('Statut mis à jour.');
    } catch (e: any) {
      showError(e?.message ?? 'Erreur');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelByBuyer = async () => {
    if (!orderId || !isBuyer || order?.status !== 'pending') return;
    setUpdating(true);
    try {
      const { error } = await supabase.rpc('cancel_order_by_buyer', { p_order_id: orderId });
      if (error) throw error;
      setOrder((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
      success('Commande annulée.');
    } catch (e: any) {
      showError(e?.message ?? 'Impossible d\'annuler.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <LoadingOverlay message="Chargement..." />;

  if (notFound || !order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 truncate">Commande</h1>
          <HomeButton />
        </header>
        <main className="max-w-lg mx-auto px-4 py-10 text-center">
          <Package size={48} className="mx-auto mb-4 text-gray-300" />
          <h1 className="text-lg font-black text-gray-900 mb-2">Commande introuvable</h1>
          <p className="text-sm text-gray-600 mb-4">
            Cette commande n'existe pas ou vous n'avez pas accès.
          </p>
          <button
            type="button"
            onClick={() => navigate(profile?.role === 'artisan' ? '/commandes?tab=recues' : '/commandes')}
            className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold text-sm"
          >
            Retour
          </button>
        </main>
      </div>
    );
  }

  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
  const statusSubtitle = STATUS_SUBTITLE[order.status];
  const otherParty = isBuyer ? order.seller : order.buyer;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur border-b border-gray-100">
        <button
          type="button"
          onClick={() => navigate(profile?.role === 'artisan' ? '/commandes?tab=recues' : '/commandes')}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="font-bold text-gray-900 truncate">Détail commande</h1>
        <HomeButton />
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex flex-col items-start gap-0.5">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
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
              {statusSubtitle && (
                <span className="text-[10px] text-gray-500">{statusSubtitle}</span>
              )}
            </div>
            <span className="text-sm font-bold text-brand-600">
              {Number(order.total_amount).toLocaleString('fr-FR')} FCFA
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {new Date(order.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Articles</h2>
          <ul className="space-y-2">
            {order.order_items?.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
              >
                <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                  {item.products?.images &&
                  Array.isArray(item.products.images) &&
                  item.products.images.length > 0 ? (
                    <img
                      src={String(item.products.images[0])}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={20} className="text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">
                    {item.products?.title ?? 'Produit'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.quantity} × {Number(item.unit_price).toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <span className="font-bold text-brand-600 text-sm">
                  {(Number(item.unit_price) * item.quantity).toLocaleString('fr-FR')} FCFA
                </span>
              </li>
            ))}
          </ul>
        </div>

        {otherParty && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-3">
              {isBuyer ? 'Artisan' : 'Client'}
            </h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                {'avatar_url' in otherParty && otherParty.avatar_url ? (
                  <img
                    src={otherParty.avatar_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={24} className="text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">
                  {otherParty.full_name ?? '—'}
                </p>
                {'phone' in otherParty && otherParty.phone && (
                  <a
                    href={`tel:${otherParty.phone}`}
                    className="flex items-center gap-1.5 text-sm text-brand-600 mt-1"
                  >
                    <Phone size={14} />
                    {otherParty.phone}
                  </a>
                )}
              </div>
              {'phone' in otherParty && otherParty.phone && (
                <a
                  href={`tel:${otherParty.phone}`}
                  className="p-2 rounded-xl bg-brand-500 text-white"
                  aria-label="Appeler"
                >
                  <Phone size={18} />
                </a>
              )}
            </div>
          </div>
        )}

        {canUpdateStatus && nextStatus && (
          <button
            type="button"
            disabled={updating}
            onClick={() => handleUpdateStatus(nextStatus)}
            className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-bold text-sm disabled:opacity-60"
          >
            {updating
              ? 'Mise à jour...'
              : nextStatus === 'confirmed'
                ? 'Confirmer la commande'
                : nextStatus === 'shipped'
                  ? 'Marquer expédiée'
                  : 'Marquer livrée'}
          </button>
        )}

        {isBuyer && order.status === 'pending' && (
          <button
            type="button"
            disabled={updating}
            onClick={handleCancelByBuyer}
            className="w-full py-3 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm disabled:opacity-60"
          >
            {updating ? 'Annulation...' : 'Annuler la commande'}
          </button>
        )}

        <p className="text-xs text-gray-500 text-center">
          {isBuyer
            ? "Paiement à la livraison. L'artisan vous contactera pour organiser la livraison."
            : 'Paiement à la livraison. Contactez le client pour organiser la livraison.'}
        </p>
      </main>
    </div>
  );
}
