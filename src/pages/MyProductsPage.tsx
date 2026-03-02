import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertTriangle, Image as ImageIcon, Trash2, Edit3, Percent, Package, ImagePlus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '@shared';
import { useProfile } from '../hooks/useProfile';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { useToastContext } from '../contexts/ToastContext';
import { HomeButton } from '../components/HomeButton';

type ProductRow = Database['public']['Tables']['products']['Row'];

export function MyProductsPage() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { success, error: showError } = useToastContext();

  const [loading, setLoading] = useState(true);
  const [tableUnavailable, setTableUnavailable] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState<string>('');
  const [status, setStatus] = useState<'published' | 'sold_out'>('published');
  const [promoPercent, setPromoPercent] = useState<string>('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const isArtisan = profile?.role === 'artisan';

  useEffect(() => {
    if (profileLoading) return;
    if (!profile || !isArtisan) {
      setLoading(false);
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('products')
          .select('*')
          .eq('artisan_id', profile.id)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching my products:', fetchError);
          const msg = (fetchError.message || '').toLowerCase();
          const code = (fetchError as { code?: string })?.code;
          const isMissingTable =
            code === 'PGRST205' ||
            code === '42P01' ||
            msg.includes('does not exist') ||
            msg.includes('relation') ||
            msg.includes('schema cache') ||
            msg.includes('could not find the table');
          if (isMissingTable) {
            setTableUnavailable(true);
            setProducts([]);
          } else {
            showError(fetchError.message || 'Impossible de charger vos produits.');
            setProducts([]);
          }
        } else {
          setTableUnavailable(false);
          setProducts((data as ProductRow[]) || []);
        }
      } catch (e: any) {
        console.error('Error fetching my products:', e);
        const msg = (e?.message ?? '').toLowerCase();
        const code = e?.code;
        const isMissingTable =
          code === 'PGRST205' ||
          code === '42P01' ||
          msg.includes('does not exist') ||
          msg.includes('relation') ||
          msg.includes('schema cache') ||
          msg.includes('could not find the table');
        if (isMissingTable) {
          setTableUnavailable(true);
          setProducts([]);
        } else {
          showError(e?.message ?? 'Erreur inconnue lors du chargement des produits.');
          setProducts([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [profile, isArtisan, profileLoading, showError]);

  const resetForm = () => {
    setTitle('');
    setPrice('');
    setDescription('');
    setStock('');
    setStatus('published');
    setPromoPercent('');
    setImageUrls([]);
    setEditingProductId(null);
    setShowCreateForm(false);
  };

  const startEdit = (product: ProductRow) => {
    setEditingProductId(product.id);
    setTitle(product.title);
    setPrice(String(Number(product.price ?? 0)));
    setDescription(product.description ?? '');
    setStock(product.stock != null ? String(product.stock) : '');
    setStatus((product.status === 'sold_out' ? 'sold_out' : 'published') as 'published' | 'sold_out');
    setPromoPercent(product.promo_percent != null ? String(product.promo_percent) : '');
    setImageUrls(
      Array.isArray(product.images) ? (product.images as string[]) : []
    );
    setShowCreateForm(true);
  };

  const handleCreateProduct = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile || !isArtisan) return;

    const priceNumber = Number(price.replace(',', '.'));
    if (!title.trim() || !priceNumber || priceNumber <= 0) {
      showError('Merci de renseigner au minimum un titre et un prix valide.');
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      price: priceNumber,
      images: imageUrls.length > 0 ? imageUrls : null,
      status,
      region: profile.region ?? null,
      department: profile.department ?? null,
      commune: profile.commune ?? null,
      stock: stock.trim() ? parseInt(stock, 10) || null : null,
      promo_percent: promoPercent.trim() ? Math.min(100, Math.max(0, parseInt(promoPercent, 10) || 0)) : null,
    };

    setSaving(true);
    try {
      if (editingProductId) {
        const { data, error: updateError } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editingProductId)
          .eq('artisan_id', profile.id)
          .select('*')
          .single();

        if (updateError) throw updateError;

        setProducts((prev) =>
          prev.map((p) => (p.id === editingProductId ? (data as ProductRow) : p))
        );
        resetForm();
        success('Produit mis à jour.');
      } else {
        const { data, error: insertError } = await supabase
          .from('products')
          .insert({
            artisan_id: profile.id,
            ...payload,
          })
          .select('*')
          .single();

        if (insertError) throw insertError;

        setProducts((prev) => [data as ProductRow, ...prev]);
        resetForm();
        success('Produit ajouté à votre boutique.');
      }
    } catch (e: any) {
      console.error(editingProductId ? 'Error updating product:' : 'Error creating product:', e);
      showError(
        e?.message ??
          (editingProductId ? "Impossible de mettre à jour le produit." : "Impossible d'ajouter le produit.")
      );
    } finally {
      setSaving(false);
    }
  };

  const sanitizeStorageFileName = (name: string): string => {
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
    const base = name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name;
    const normalized = base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .slice(0, 80);
    return (normalized || 'image') + ext;
  };

  const handleImagesUpload = async (files: FileList | null) => {
    if (!files || !profile || !isArtisan) return;
    const selected = Array.from(files).slice(0, 10);
    if (selected.length === 0) return;
    setUploadingImages(true);
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        const safeName = sanitizeStorageFileName(file.name);
        const fileName = `${profile.id}/products/${Date.now()}-${safeName}`;
        const { data, error } = await supabase.storage.from('photos').upload(fileName, file);
        if (error) throw error;
        const url = supabase.storage.from('photos').getPublicUrl(data.path).data.publicUrl;
        uploaded.push(url);
      }
      setImageUrls((prev) => [...prev, ...uploaded].slice(0, 10));
      success(`${uploaded.length} image(s) ajoutée(s).`);
    } catch (e: any) {
      showError(e?.message ?? "Impossible d'uploader les images.");
    } finally {
      setUploadingImages(false);
    }
  };

  const handleToggleSoldOut = async (product: ProductRow) => {
    const newStatus = product.status === 'sold_out' ? 'published' : 'sold_out';
    try {
      const { error } = await supabase
        .from('products')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', product.id);
      if (error) throw error;
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: newStatus } : p))
      );
      success(newStatus === 'sold_out' ? 'Produit marqué en rupture.' : 'Produit remis en vente.');
    } catch (e: any) {
      showError(e?.message ?? 'Erreur');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!productId) return;
    if (!window.confirm('Supprimer ce produit de votre boutique ?')) return;

    try {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (deleteError) {
        throw deleteError;
      }

      setProducts((prev) => prev.filter((p) => p.id !== productId));
      success('Produit supprimé.');
    } catch (e: any) {
      console.error('Error deleting product:', e);
      showError(e?.message ?? "Impossible de supprimer le produit.");
    }
  };

  if (profileLoading || loading) {
    return <LoadingOverlay />;
  }

  if (!profile || !isArtisan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertTriangle size={40} className="text-amber-500 mx-auto mb-4" />
          <h1 className="text-lg font-black text-gray-900 mb-2">Accès réservé aux artisans</h1>
          <p className="text-sm text-gray-600 mb-4">
            Seuls les comptes artisans peuvent gérer une boutique de produits.
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

  if (tableUnavailable) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <Package size={48} className="text-brand-500 mx-auto mb-4" />
          <h1 className="text-lg font-black text-gray-900 mb-2">Boutique en préparation</h1>
          <p className="text-sm text-gray-600 mb-4">
            La gestion des produits sera bientôt disponible. Revenez plus tard ou consultez votre tableau de bord.
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-colors"
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
          <h1 className="font-bold text-gray-900 truncate">Ma boutique</h1>
          <p className="text-xs text-gray-400">Gérez vos produits sur le marketplace</p>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32 space-y-6">
        {/* Liste des produits existants */}
        <section className="space-y-3">
          {products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-500">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <ImageIcon size={20} className="text-gray-300" />
              </div>
              Aucun produit dans votre boutique pour le moment.
            </div>
          ) : (
            products.map((product) => (
              <div key={product.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3">
                <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {Array.isArray(product.images) && product.images.length > 0 ? (
                    <img src={String(product.images[0])} alt={product.title} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon size={20} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-2">
                      {product.title}
                    </h3>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {product.promo_percent != null && product.promo_percent > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                          -{product.promo_percent}%
                        </span>
                      )}
                      <span className="text-xs font-semibold text-brand-600 whitespace-nowrap">
                        {product.promo_percent != null && product.promo_percent > 0 ? (
                          <>
                            <span className="text-gray-400 line-through mr-1">
                              {Number(product.price || 0).toLocaleString('fr-FR')}
                            </span>
                            {(
                              Number(product.price || 0) *
                              (1 - (product.promo_percent || 0) / 100)
                            ).toLocaleString('fr-FR')}{' '}
                            FCFA
                          </>
                        ) : (
                          `${Number(product.price || 0).toLocaleString('fr-FR')} FCFA`
                        )}
                      </span>
                    </div>
                  </div>
                  {product.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                      {product.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            product.status === 'published'
                              ? 'bg-green-500'
                              : product.status === 'sold_out'
                              ? 'bg-gray-400'
                              : 'bg-amber-500'
                          }`}
                        />
                        {product.status === 'published'
                          ? 'Publié'
                          : product.status === 'draft'
                          ? 'Brouillon'
                          : product.status === 'sold_out'
                          ? 'Épuisé'
                          : 'Archivé'}
                      </span>
                      {product.stock != null && (
                        <span className="text-[11px] text-gray-500">Stock: {product.stock}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSoldOut(product)}
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium"
                        title={product.status === 'sold_out' ? 'Remettre en vente' : 'Marquer rupture'}
                      >
                        {product.status === 'sold_out' ? 'Remettre' : 'Rupture'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(product)}
                        className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-medium"
                        title="Modifier le produit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                        title="Supprimer le produit"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        <section className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (showCreateForm) {
                resetForm();
              } else {
                setEditingProductId(null);
                setTitle('');
                setPrice('');
                setDescription('');
                setStock('');
                setStatus('published');
                setPromoPercent('');
                setImageUrls([]);
                setShowCreateForm(true);
              }
            }}
            className="w-16 h-16 rounded-full bg-brand-500 text-white shadow-xl shadow-brand-500/30 hover:bg-brand-600 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
            aria-label={showCreateForm ? 'Fermer le formulaire' : 'Ajouter un nouvel article'}
            title={showCreateForm ? 'Fermer le formulaire' : 'Ajouter un nouvel article'}
          >
            <Plus size={28} strokeWidth={2.5} />
          </button>
          <span className="text-xs font-semibold text-gray-500">
            {showCreateForm ? 'Fermer' : 'Ajouter un article'}
          </span>

          {showCreateForm && (
            <form onSubmit={handleCreateProduct} className="space-y-3 mt-4">
              {editingProductId && (
                <p className="text-sm font-semibold text-gray-700">Modifier le produit</p>
              )}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre du produit (ex: Porte en bois massif)"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step="100"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Prix (FCFA)"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                />
                <span className="text-xs font-semibold text-gray-500">FCFA</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-gray-400 flex-shrink-0" />
                  <input
                    type="number"
                    min={0}
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="Stock (optionnel)"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Percent size={16} className="text-gray-400 flex-shrink-0" />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={promoPercent}
                    onChange={(e) => setPromoPercent(e.target.value)}
                    placeholder="Promo % (optionnel)"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-gray-600">Statut :</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'published' | 'sold_out')}
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="published">Disponible</option>
                  <option value="sold_out">Rupture / Sold out</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 block">
                  Photos du produit (max 10)
                </label>
                <label className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3 text-sm text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors">
                  <ImagePlus size={16} />
                  {uploadingImages ? 'Upload en cours...' : 'Ajouter des photos'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImagesUpload(e.target.files)}
                    disabled={uploadingImages}
                  />
                </label>
                {imageUrls.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {imageUrls.map((url) => (
                      <div key={url} className="relative rounded-lg overflow-hidden border border-gray-100">
                        <img src={url} alt="" className="w-full h-16 object-cover" />
                        <button
                          type="button"
                          onClick={() => setImageUrls((prev) => prev.filter((u) => u !== url))}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description (dimensions, matériaux, délais...)"
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none resize-none"
                />
              </div>
              <div className="flex gap-2">
                {editingProductId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className={`${editingProductId ? 'flex-1' : 'w-full'} rounded-xl bg-brand-500 text-white text-sm font-bold py-2.5 flex items-center justify-center gap-2 hover:bg-brand-600 transition-colors disabled:opacity-60`}
                >
                  {saving
                    ? 'Enregistrement...'
                    : editingProductId
                    ? 'Enregistrer'
                    : 'Publier le produit'}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

