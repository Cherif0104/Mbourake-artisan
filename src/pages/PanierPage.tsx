import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  ShoppingBag,
  Heart,
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  Package,
} from 'lucide-react';
import { HomeButton } from '../components/HomeButton';
import { LoadingOverlay } from '../components/LoadingOverlay';
import {
  getCart,
  removeFromCart,
  updateCartQuantity,
  getCartTotal,
  type CartItem,
} from '../lib/cart';
import { supabase } from '../lib/supabase';

type TabId = 'panier' | 'commandes' | 'favoris';

type OrderRow = {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  order_items?: { products?: { title: string; images: unknown } | null }[];
  profiles?: { full_name: string | null } | null;
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export function PanierPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('panier');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersUnavailable, setOrdersUnavailable] = useState(false);

  const refreshCart = useCallback(() => {
    setCartItems(getCart());
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  useEffect(() => {
    if (activeTab !== 'commandes') return;
    const fetchOrders = async () => {
      setOrdersLoading(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.data.user?.id;
        if (!userId) {
          setOrders([]);
          setOrdersLoading(false);
          return;
        }
        const { data: ordersData, error } = await supabase
          .from('orders')
          .select(
            `
            id, total_amount, status, created_at,
            profiles!orders_seller_id_fkey ( full_name )
          `
          )
          .eq('buyer_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('does not exist') || msg.includes('relation')) {
            setOrdersUnavailable(true);
          }
          setOrders([]);
          setOrdersLoading(false);
          return;
        }
        const list = (ordersData as OrderRow[]) ?? [];
        const withItems: OrderRow[] = await Promise.all(
          list.map(async (o) => {
            const { data: items } = await supabase
              .from('order_items')
              .select('*, products(title, images)')
              .eq('order_id', o.id);
            return { ...o, order_items: items as OrderRow['order_items'] };
          })
        );
        setOrders(withItems);
        setOrdersUnavailable(false);
      } catch {
        setOrders([]);
        setOrdersUnavailable(true);
      } finally {
        setOrdersLoading(false);
      }
    };
    fetchOrders();
  }, [activeTab]);

  const handleRemove = (productId: string) => {
    removeFromCart(productId);
    refreshCart();
  };

  const handleQuantity = (productId: string, delta: number) => {
    const item = cartItems.find((i) => i.productId === productId);
    if (!item) return;
    const next = Math.max(0, item.quantity + delta);
    updateCartQuantity(productId, next);
    refreshCart();
  };

  const total = getCartTotal(cartItems);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'panier', label: 'Panier', icon: <ShoppingCart size={18} /> },
    { id: 'commandes', label: 'Commandes', icon: <ShoppingBag size={18} /> },
    { id: 'favoris', label: 'Favoris', icon: <Heart size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-40 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="p-2 -ml-2 rounded-xl hover:bg-gray-100"
          aria-label="Retour"
        >
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">Panier & Commandes</h1>
          <p className="text-xs text-gray-400">Articles, commandes validées et favoris</p>
        </div>
        <HomeButton />
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 px-4">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-t-xl transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'panier' && cartItems.length > 0 && (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-white/20 text-xs">
                  {cartItems.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-lg mx-auto px-4 py-6">
        {activeTab === 'panier' && (
          <>
            {cartItems.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <ShoppingCart size={28} className="text-gray-400" />
                </div>
                <p className="font-medium text-gray-700 mb-1">Votre panier est vide</p>
                <p className="text-sm text-gray-500 mb-6">
                  Parcourez le marché et ajoutez des articles pour les retrouver ici.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/marketplace')}
                  className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600"
                >
                  Voir le marché
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <ul className="space-y-3">
                  {cartItems.map((item) => {
                    const unitPrice =
                      item.promoPercent && item.promoPercent > 0
                        ? item.price * (1 - item.promoPercent / 100)
                        : item.price;
                    return (
                      <li
                        key={item.productId}
                        className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-3"
                      >
                        <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={24} className="text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 line-clamp-2 text-sm">
                            {item.title}
                          </p>
                          <p className="text-sm font-bold text-brand-600 mt-0.5">
                            {unitPrice.toLocaleString('fr-FR')} FCFA
                            {item.promoPercent && item.promoPercent > 0 && (
                              <span className="text-gray-400 line-through ml-1 text-xs font-normal">
                                {item.price.toLocaleString('fr-FR')}
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => handleQuantity(item.productId, -1)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="px-2 min-w-[24px] text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleQuantity(item.productId, 1)}
                                className="p-1.5 text-gray-600 hover:bg-gray-100"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemove(item.productId)}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                              title="Retirer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="text-lg font-black text-brand-600">
                    {total.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const first = cartItems[0];
                    if (first)
                      navigate(`/marketplace/${first.productId}/checkout`);
                  }}
                  className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition-colors flex items-center justify-center gap-2"
                >
                  Passer la commande
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'commandes' && (
          <>
            {ordersLoading ? (
              <LoadingOverlay message="Chargement des commandes..." />
            ) : ordersUnavailable ? (
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
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <ShoppingBag size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="font-medium text-gray-700 mb-1">Aucune commande</p>
                <p className="text-sm text-gray-500 mb-6">
                  Vos commandes validées apparaîtront ici.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/marketplace')}
                  className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold text-sm"
                >
                  Découvrir le marché
                </button>
              </div>
            ) : (
              <ul className="space-y-3">
                {orders.map((order) => {
                  const primaryItem = order.order_items?.[0];
                  const title = primaryItem?.products?.title ?? 'Commande';
                  const statusLabel = ORDER_STATUS_LABELS[order.status] ?? order.status;
                  return (
                    <li key={order.id}>
                      <button
                        type="button"
                        onClick={() => navigate('/my-orders')}
                        className="w-full bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm text-left hover:border-brand-100 transition-colors"
                      >
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
                            {order.profiles?.full_name && ` · ${order.profiles.full_name}`}
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

        {activeTab === 'favoris' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Heart size={28} className="text-red-400" />
            </div>
            <p className="font-medium text-gray-700 mb-1">Vos favoris</p>
            <p className="text-sm text-gray-500 mb-6">
              Artisans et articles que vous avez mis de côté.
            </p>
            <button
              type="button"
              onClick={() => navigate('/favorites')}
              className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold text-sm hover:bg-brand-600"
            >
              Voir mes favoris
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
