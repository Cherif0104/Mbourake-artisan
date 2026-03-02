import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Database } from '@shared';
import { useProfile } from '../hooks/useProfile';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { useToastContext } from '../contexts/ToastContext';
import { BackButton } from '../components/BackButton';

type CertificationRow = Database['public']['Tables']['artisan_certifications']['Row'];
const TYPE_LABELS: Record<string, string> = {
  diplome: 'Diplôme',
  badge: 'Badge',
  reconnaissance: 'Reconnaissance',
};

export function MyCertificationsPage() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();
  const { success, error: showError } = useToastContext();
  const [list, setList] = useState<CertificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'diplome' | 'badge' | 'reconnaissance'>('diplome');
  const [imageUrl, setImageUrl] = useState('');
  const [issuer, setIssuer] = useState('');

  const isArtisan = profile?.role === 'artisan';

  useEffect(() => {
    if (!profile || !isArtisan) {
      setLoading(false);
      return;
    }
    const fetchList = async () => {
      const { data, error } = await supabase
        .from('artisan_certifications')
        .select('*')
        .eq('artisan_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) {
        showError(error.message);
        setList([]);
      } else {
        setList((data as CertificationRow[]) || []);
      }
      setLoading(false);
    };
    fetchList();
  }, [profile?.id, isArtisan, profileLoading, showError]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !title.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('artisan_certifications').insert({
        artisan_id: profile.id,
        title: title.trim(),
        type,
        image_url: imageUrl.trim() || null,
        issuer: issuer.trim() || null,
      });
      if (error) throw error;
      const { data: newList } = await supabase
        .from('artisan_certifications')
        .select('*')
        .eq('artisan_id', profile.id)
        .order('created_at', { ascending: false });
      setList((newList as CertificationRow[]) || []);
      setTitle('');
      setImageUrl('');
      setIssuer('');
      setShowForm(false);
      success('Certification ajoutée.');
    } catch (err: any) {
      showError(err?.message ?? 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette certification ?')) return;
    try {
      const { error } = await supabase.from('artisan_certifications').delete().eq('id', id);
      if (error) throw error;
      setList((prev) => prev.filter((c) => c.id !== id));
      success('Certification supprimée.');
    } catch (err: any) {
      showError(err?.message ?? 'Erreur');
    }
  };

  if (profileLoading || loading) return <LoadingOverlay />;
  if (!profile || !isArtisan) {
    navigate('/profile', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-4">
        <BackButton onClick={() => navigate('/profile')} />
        <div className="flex-1">
          <h1 className="font-bold text-gray-900">Certifications</h1>
          <p className="text-xs text-gray-500">Diplômes, badges, reconnaissances</p>
        </div>
      </header>
      <main className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-4">
        {!showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600 transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            Ajouter une certification
          </button>
        ) : (
          <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre (ex: CAP Menuiserie)"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              required
            />
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'diplome' | 'badge' | 'reconnaissance')}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            >
              <option value="diplome">Diplôme</option>
              <option value="badge">Badge</option>
              <option value="reconnaissance">Reconnaissance</option>
            </select>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="URL de l'image (optionnel)"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
            <input
              type="text"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="Organisme émetteur (optionnel)"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}
        {list.length === 0 && !showForm ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-sm text-gray-500">
            <Award size={32} className="mx-auto text-gray-300 mb-2" />
            Aucune certification pour le moment.
          </div>
        ) : (
          list.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3"
            >
              {c.image_url ? (
                <img
                  src={c.image_url}
                  alt={c.title}
                  className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <Award size={24} className="text-amber-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900">{c.title}</p>
                <p className="text-xs text-gray-500">{TYPE_LABELS[c.type] || c.type}</p>
                {c.issuer && <p className="text-xs text-gray-500 mt-0.5">Émetteur: {c.issuer}</p>}
              </div>
              <button
                type="button"
                onClick={() => handleDelete(c.id)}
                className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                aria-label="Supprimer"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
