import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '@shared';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { HomeButton } from '../components/HomeButton';
import { useToastContext } from '../contexts/ToastContext';

type ProductRow = Database['public']['Tables']['products']['Row'];

export function MarketplaceCheckoutPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { success, error: showError } = useToastContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notFound, setNotFound] = useState(false);

  const maxQty =
    product?.stock != null
      ? Math.max(1, product.stock)
      : 99;

  useEffect(() => {
    if (!productId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, title, price, stock, status, promo_percent')
          .eq('id', productId)
          .eq('status', 'published')
          .maybeSingle();

        if (error || !data) {
          setNotFound(true);
          setProduct(null);
        } else {
          setProduct(data as ProductRow);
          setQuantity(1);
        }
      } catch {
        setNotFound(true);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const unitPrice =
    product && product.promo_percent != null && product.promo_percent > 0
      ? Number(product.price) * (1 - product.promo_percent / 100)
      : product
        ? Number(product.price)
        : 0;
  const total = unitPrice * quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !product || quantity < 1 || quantity > maxQty) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('create_marketplace_order', {
        p_product_id: productId,
        p_quantity: quantity,
        p_shipping_address: null,
      });

      if (error) throw error;
      success('Commande enregistrée. L\'artisan vous contactera pour la livraison.');
      navigate('/my-orders', { state: { orderId: data } });
    } catch (e: any) {
      const msg = e?.message ?? 'Impossible de créer la commande.';
      showError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingOverlay message="Chargement..." />;
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <HomeButton />
        </header>
        <main className="max-w-lg mx-auto px-4 py-10 text-center">
          <h1 className="text-lg font-black text-gray-900 mb-2">Produit introuvable</h1>
          <p className="text-sm text-gray-600 mb-4">Ce produit n'existe pas ou n'est plus disponible.</p>
          <button
            type="button"
            onClick={() => navigate('/marketplace')}
            className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold text-sm"
          >
            Retour à la marketplace
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur border-b border-gray-100">
        <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="font-bold text-gray-900 truncate">Commander</h1>
        <HomeButton />
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-900 mb-1">{product.title}</h2>
          <p className="text-brand-600 font-bold">
            {unitPrice.toLocaleString('fr-FR')} FCFA
            {product.promo_percent != null && product.promo_percent > 0 && (
              <span className="text-gray-400 font-medium line-through ml-2">
                {Number(product.price).toLocaleString('fr-FR')} FCFA
              </span>
            )}
          </p>
          {product.stock != null && (
            <p className="text-xs text-gray-500 mt-1">En stock : {product.stock}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Quantité</label>
            <input
              type="number"
              min={1}
              max={maxQty}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(maxQty, parseInt(e.target.value, 10) || 1)))}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

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
            {saving ? 'Enregistrement...' : 'Confirmer la commande'}
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          L'artisan vous contactera pour convenir du paiement et de la livraison.
        </p>
      </main>
    </div>
  );
}
