import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, MapPin, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useProfile } from '../hooks/useProfile';
import { LoadingOverlay } from '../components/LoadingOverlay';

interface ChambreMetier {
  id: string;
  name: string;
  region: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

interface AffiliationWithArtisan {
  id: string;
  status: string;
  affiliation_type: string;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    region: string | null;
    department: string | null;
    commune: string | null;
    formalisation_status: string | null;
    professionalisation_status: string | null;
    labellisation_status: string | null;
  } | null;
}

export function ChambreDashboardPage() {
  const navigate = useNavigate();
  const { profile, loading: profileLoading } = useProfile();

  const [loading, setLoading] = useState(true);
  const [chambres, setChambres] = useState<ChambreMetier[]>([]);
  const [affiliations, setAffiliations] = useState<AffiliationWithArtisan[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profileLoading) return;
    if (!profile || profile.role !== 'chambre_metier') {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Récupérer la/les chambre(s) administrée(s) par cet utilisateur
        const { data: chambresData, error: chambresError } = await supabase
          .from('chambres_metier' as any)
          .select('*')
          .eq('admin_id', profile.id);

        if (chambresError) {
          throw chambresError;
        }

        const chambresList = (chambresData as ChambreMetier[]) || [];
        setChambres(chambresList);

        if (chambresList.length === 0) {
          setAffiliations([]);
          setLoading(false);
          return;
        }

        const chambreIds = chambresList.map((c) => c.id);

        // Récupérer les affiliations des artisans pour ces chambres avec profil artisan
        const { data: affiliationsData, error: affError } = await supabase
          .from('artisan_affiliations' as any)
          .select(
            `
            id,
            status,
            affiliation_type,
            artisan_id,
            profiles!artisan_affiliations_artisan_id_fkey (
              id,
              full_name,
              avatar_url,
              region,
              department,
              commune,
              formalisation_status,
              professionalisation_status,
              labellisation_status
            )
          `,
          )
          .in('chambre_id', chambreIds)
          .order('created_at', { ascending: false });

        if (affError) {
          throw affError;
        }

        setAffiliations((affiliationsData as AffiliationWithArtisan[]) || []);
      } catch (e: any) {
        console.error('Error loading chambre dashboard:', e);
        setError(e?.message ?? 'Erreur lors du chargement du tableau de bord chambre.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile, profileLoading]);

  if (profileLoading || loading) {
    return <LoadingOverlay />;
  }

  if (!profile || profile.role !== 'chambre_metier') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertTriangle size={40} className="text-amber-500 mx-auto mb-4" />
          <h1 className="text-lg font-black text-gray-900 mb-2">Accès réservé</h1>
          <p className="text-sm text-gray-600 mb-4">
            Ce tableau de bord est réservé aux comptes Chambre de Métiers.
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

  const totalAffiliations = affiliations.length;
  const verifiedCount = affiliations.filter((a) => a.status === 'verified').length;
  const pendingCount = affiliations.filter((a) => a.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">Tableau de bord Chambre</h1>
          <p className="text-xs text-gray-400">
            Suivi des artisans affiliés et de leur parcours F‑P‑L
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 pb-24 space-y-6">
        {/* Infos chambre(s) */}
        {chambres.length > 0 && (
          <section className="grid gap-4 md:grid-cols-2">
            {chambres.map((chambre) => (
              <div
                key={chambre.id}
                className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-3 shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
                  <Building2 size={20} className="text-brand-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm mb-1">{chambre.name}</h2>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin size={12} />
                    {chambre.region}
                  </p>
                  {chambre.phone && (
                    <p className="text-xs text-gray-500 mt-1">{chambre.phone}</p>
                  )}
                  {chambre.email && (
                    <p className="text-xs text-gray-500">{chambre.email}</p>
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Stats F‑P‑L */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Artisans affiliés</p>
              <p className="text-xl font-black text-gray-900">{totalAffiliations}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Users size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Affiliations vérifiées</p>
              <p className="text-xl font-black text-gray-900">{verifiedCount}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">En attente</p>
              <p className="text-xl font-black text-gray-900">{pendingCount}</p>
            </div>
          </div>
        </section>

        {/* Liste des artisans et F‑P‑L */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <h2 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
            <Users size={18} className="text-gray-700" />
            Artisans affiliés
          </h2>
          {affiliations.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aucun artisan affilié pour le moment.
            </p>
          ) : (
            <div className="space-y-3">
              {affiliations.map((aff) => {
                const artisan = aff.profiles;
                if (!artisan) return null;
                const location =
                  artisan.commune ||
                  artisan.department ||
                  artisan.region ||
                  'Sénégal';
                return (
                  <div
                    key={aff.id}
                    className="flex items-start gap-3 border border-gray-100 rounded-xl px-3 py-2.5"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {artisan.avatar_url ? (
                        <img
                          src={artisan.avatar_url}
                          alt={artisan.full_name ?? ''}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-bold text-gray-500">
                          {artisan.full_name?.charAt(0) ?? 'A'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {artisan.full_name ?? 'Artisan'}
                        </p>
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                            aff.status === 'verified'
                              ? 'bg-green-50 text-green-700 border border-green-100'
                              : aff.status === 'pending'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-red-50 text-red-700 border border-red-100'
                          }`}
                        >
                          {aff.status === 'verified'
                            ? 'Vérifié'
                            : aff.status === 'pending'
                            ? 'En attente'
                            : 'Rejeté'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} />
                        {location}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                        <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
                          F: {artisan.formalisation_status || 'à démarrer'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
                          P: {artisan.professionalisation_status || 'à démarrer'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-100">
                          L: {artisan.labellisation_status || 'à démarrer'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

