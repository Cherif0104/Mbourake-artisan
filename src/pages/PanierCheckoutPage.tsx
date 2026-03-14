import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Package, ShoppingCart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { HomeButton } from '../components/HomeButton';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { useToastContext } from '../contexts/ToastContext';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import {
  getCart,
  getCartTotal,
  clearCart,
  CART_UPDATED_EVENT,
} from '../lib/cart';
import { notifyArtisanNewOrder } from '../lib/notificationService';

export function PanierCheckoutPage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToastContext();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cartItems, setCartItems] = useState(getCart());

  useEffect(() => {
    const refresh = () => setCartItems(getCart());
    refresh();
    window.addEventListener(CART_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CART_UPDATED_EVENT, refresh);
  }, []);

  useEffect(() => {
    if (cartItems.length === 0) {
      setLoading(false);
      return;
    }
    setLoading(false);
  }, [cartItems.length]);

  const total = getCartTotal(cartItems);
  const buyerName =
    profile?.full_name ||
    (user?.user_metadata?.full_name as string) ||
    user?.email ||
    'Un client';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      showError('Votre panier est vide.');
      return;
    }
    setSaving(true);
    try {
      const items = cartItems.map((i) => ({
        product_id: i.productId,
        quantity: i.quantity,
      }));

      const { data: orderIds, error } = await supabase.rpc(
        'create_marketplace_orders_from_cart',
        { p_items: items }
      );

      if (error) throw error;

      const ids = (orderIds as string[]) || [];
      if (ids.length === 0) {
        throw new Error('Aucune commande créée.');
      }

      // Notifier chaque artisan (seller_id = artisan)
      for (const orderId of ids) {
        const { data: order } = await supabase
          .from('orders')
          .select(`
            seller_id,
            order_items (
              products ( title )
            )
          `)
          .eq('id', orderId)
          .single();
        const o = order as { seller_id?: string; order_items?: { products?: { title?: string } | null }[] } | null;
        if (o?.seller_id) {
          const firstItem = o.order_items?.[0];
          const productTitle = firstItem?.products?.title ?? 'Produit';
          notifyArtisanNewOrder(orderId, o.seller_id, productTitle, buyerName).catch(() => {});
        }
      }

      clearCart();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT));
      }
      success(
        ids.length === 1
          ? 'Commande enregistrée. Paiement à la livraison. Consultez Mes achats.'
          : `${ids.length} commandes enregistrées. Paiement à la livraison. Consultez Mes achats.`
      );
      navigate('/commandes', { state: { orderIds: ids } });
    } catch (e: any) {
      showError(e?.message ?? 'Impossible de créer les commandes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingOverlay message="Chargement..." />;
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/panier')}
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <h1 className="font-bold text-gray-900 truncate">Checkout</h1>
          <HomeButton />
        </header>
        <main className="max-w-lg mx-auto px-4 py-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={28} className="text-gray-400" />
          </div>
          <h1 className="text-lg font-black text-gray-900 mb-2">Panier vide</h1>
          <p className="text-sm text-gray-600 mb-4">
            Ajoutez des articles au panier avant de passer commande.
          </p>
          <button
            type="button"
            onClick={() => navigate('/marketplace')}
            className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold text-sm"
          >
            Voir le marché
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur border-b border-gray-100">
        <button
          type="button"
          onClick={() => navigate('/panier')}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="font-bold text-gray-900 truncate">Confirmer la commande</h1>
        <HomeButton />
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-900 mb-3">
            {cartItems.length} article{cartItems.length > 1 ? 's' : ''}
          </h2>
          <ul className="space-y-2">
            {cartItems.map((item) => {
              const unitPrice =
                item.promoPercent && item.promoPercent > 0
                  ? item.price * (1 - item.promoPercent / 100)
                  : item.price;
              const lineTotal = unitPrice * item.quantity;
              return (
                <li
                  key={item.productId}
                  className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                >
                  <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
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
                    <p className="font-semibold text-gray-900 text-sm line-clamp-2">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.quantity} × {unitPrice.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>
                  <span className="font-bold text-brand-600 text-sm">
                    {lineTotal.toLocaleString('fr-FR')} FCFA
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between text-lg font-bold text-gray-900 pt-2">
            <span>Total</span>
            <span>{total.toLocaleString('fr-FR')} FCFA</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-brand-500 text-white font-bold py-3.5 flex items-center justify-center gap-2 hover:bg-brand-600 transition-colors disabled:opacity-60"
          >
            <ShoppingBag size={20} />
            {saving ? 'Enregistrement...' : 'Confirmer les commandes'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          Paiement à la livraison. Une commande par artisan ; ils vous
          contacteront pour organiser la livraison.
        </p>
      </main>
    </div>
  );
}
