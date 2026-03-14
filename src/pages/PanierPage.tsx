import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Heart,
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  Package,
  ShoppingBag,
} from 'lucide-react';
import { HomeButton } from '../components/HomeButton';
import { CartBadge } from '../components/CartBadge';
import {
  getCart,
  removeFromCart,
  updateCartQuantity,
  getCartTotal,
  type CartItem,
} from '../lib/cart';

type TabId = 'panier' | 'favoris';

export function PanierPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('panier');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const refreshCart = useCallback(() => {
    setCartItems(getCart());
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

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
          <h1 className="font-bold text-gray-900 truncate">Panier</h1>
          <p className="text-xs text-gray-400">Articles et favoris</p>
        </div>
        <CartBadge />
        <HomeButton />
      </header>

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
                <button
                  type="button"
                  onClick={() => navigate('/commandes')}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-brand-500 text-brand-600 font-bold text-sm"
                >
                  <ShoppingBag size={18} />
                  Voir mes commandes
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
                  onClick={() => navigate('/panier/checkout')}
                  className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition-colors flex items-center justify-center gap-2"
                >
                  Passer la commande
                  <ChevronRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/commandes')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm"
                >
                  <ShoppingBag size={18} />
                  Voir mes commandes
                </button>
              </div>
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
              className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold text-sm"
            >
              Voir mes favoris
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
