import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { getCart } from '../lib/cart';
import { CART_UPDATED_EVENT } from '../lib/cart';

/**
 * Icône panier avec badge (nombre d'articles).
 * Clic → /panier. S'affiche sur marketplace et fiche produit.
 */
export function CartBadge() {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);

  const refresh = () => {
    const items = getCart();
    setCount(items.reduce((sum, i) => sum + i.quantity, 0));
  };

  useEffect(() => {
    refresh();
    const handle = () => refresh();
    window.addEventListener(CART_UPDATED_EVENT, handle);
    return () => window.removeEventListener(CART_UPDATED_EVENT, handle);
  }, []);

  return (
    <button
      type="button"
      onClick={() => navigate('/panier')}
      className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
      aria-label={count > 0 ? `Panier : ${count} article${count > 1 ? 's' : ''}` : 'Panier'}
      title="Voir le panier"
    >
      <ShoppingCart size={22} className="text-gray-700" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-brand-500 text-white text-[11px] font-bold">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  );
}
