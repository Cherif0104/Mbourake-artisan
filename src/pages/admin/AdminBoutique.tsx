import React, { useEffect, useState } from 'react';
import { Search, Package, User, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingOverlay } from '../../components/LoadingOverlay';

interface ProductRow {
  id: string;
  title: string;
  price: number;
  status: string;
  created_at: string;
  artisan_id: string;
  profiles?: { full_name: string | null } | null;
}

export function AdminBoutique() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('id, title, price, status, created_at, artisan_id, profiles!products_artisan_id_fkey(full_name)')
        .order('created_at', { ascending: false });
      if (!error && data) setProducts(data as ProductRow[]);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const filtered = products.filter((p) => {
    const matchSearch =
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.profiles?.full_name ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <LoadingOverlay />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un produit ou artisan..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none font-medium"
        >
          <option value="all">Tous les statuts</option>
          <option value="published">Publié</option>
          <option value="sold_out">Rupture</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="divide-y divide-gray-50">
          {filtered.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              Aucun produit trouvé
            </div>
          ) : (
            filtered.map((p) => (
              <div key={p.id} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${p.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {p.status === 'published' ? 'Publié' : 'Rupture'}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 truncate">{p.title}</h4>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <User size={12} />
                    {p.profiles?.full_name ?? '—'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-brand-600">{Number(p.price || 0).toLocaleString('fr-FR')} FCFA</p>
                  <a
                    href={`/marketplace/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-brand-600 mt-1"
                  >
                    <Eye size={12} /> Voir
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
