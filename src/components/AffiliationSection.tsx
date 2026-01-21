import { useState, useEffect } from 'react';
import { X, Check, Clock, XCircle, Building2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';

interface Affiliation {
  id: string;
  affiliation_type: 'chambre' | 'incubateur' | 'sae' | 'autre';
  affiliation_name: string | null;
  affiliation_number: string | null;
  ninea: string | null;
  rccm: string | null;
  certificate_url: string | null;
  status: 'pending' | 'verified' | 'rejected';
  verified_at: string | null;
  rejection_reason: string | null;
  chambre_id: string | null;
}

interface AffiliationSectionProps {
  artisanId: string;
}

export function AffiliationSection({ artisanId }: AffiliationSectionProps) {
  const { success: showSuccess, error: showError } = useToastContext();
  const [affiliations, setAffiliations] = useState<Affiliation[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Formulaire pour nouvelle affiliation
  const [showForm, setShowForm] = useState(false);
  const [affiliationType, setAffiliationType] = useState<'chambre' | 'incubateur' | 'sae' | 'autre'>('chambre');
  const [affiliationName, setAffiliationName] = useState('');
  const [affiliationNumber, setAffiliationNumber] = useState('');
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [chambres, setChambres] = useState<Array<{ id: string; name: string; region: string }>>([]);
  const [selectedChambre, setSelectedChambre] = useState<string>('');

  // Charger les affiliations existantes
  useEffect(() => {
    if (!artisanId) return;
    loadAffiliations();
    loadChambres();
  }, [artisanId]);

  const loadAffiliations = async () => {
    try {
      const { data, error } = await supabase
        .from('artisan_affiliations')
        .select('*')
        .eq('artisan_id', artisanId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAffiliations(data || []);
    } catch (err: any) {
      console.error('Error loading affiliations:', err);
      showError('Erreur lors du chargement des affiliations');
    }
  };

  const loadChambres = async () => {
    try {
      const { data, error } = await supabase
        .from('chambres_metier')
        .select('id, name, region')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setChambres(data || []);
    } catch (err: any) {
      console.error('Error loading chambres:', err);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artisanId) return;

    // Validation pour chambre de métier
    if (affiliationType === 'chambre') {
      if (!selectedChambre) {
        showError('Veuillez sélectionner une chambre de métier');
        return;
      }
      if (!ninea.trim()) {
        showError('Le NINEA est obligatoire pour les chambres de métier');
        return;
      }
      if (!rccm.trim()) {
        showError('Le RCCM est obligatoire pour les chambres de métier');
        return;
      }
    }

    setLoading(true);

    try {
      // Déterminer le nom de l'affiliation
      let finalAffiliationName = affiliationName;
      if (affiliationType === 'chambre' && selectedChambre) {
        const chambre = chambres.find(c => c.id === selectedChambre);
        finalAffiliationName = chambre?.name || '';
      }

      // Créer l'affiliation
      const { error } = await supabase
        .from('artisan_affiliations')
        .insert({
          artisan_id: artisanId,
          affiliation_type: affiliationType,
          affiliation_name: finalAffiliationName || null,
          affiliation_number: affiliationNumber || null,
          ninea: ninea.trim() || null,
          rccm: rccm.trim() || null,
          certificate_url: null, // Plus besoin de certificat
          chambre_id: affiliationType === 'chambre' ? selectedChambre || null : null,
          status: 'pending',
        });

      if (error) throw error;

      showSuccess('Affiliation soumise avec succès. Elle sera vérifiée par un administrateur.');
      setShowForm(false);
      resetForm();
      loadAffiliations();
    } catch (err: any) {
      console.error('Error submitting affiliation:', err);
      showError(err.message || 'Erreur lors de la soumission de l\'affiliation');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAffiliationType('chambre');
    setAffiliationName('');
    setAffiliationNumber('');
    setNinea('');
    setRccm('');
    setSelectedChambre('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
            <Check size={14} />
            Vérifiée
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold">
            <XCircle size={14} />
            Rejetée
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
            <Clock size={14} />
            En attente
          </span>
        );
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'chambre':
        return 'Chambre de Métier';
      case 'incubateur':
        return 'Incubateur';
      case 'sae':
        return 'SAE';
      case 'autre':
        return 'Autre organisme';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 rounded-xl p-4 mb-6">
        <p className="text-sm text-blue-700 font-medium">
          🏛️ Les affiliations avec des chambres de métier, incubateurs ou SAE renforcent votre crédibilité auprès des clients.
        </p>
      </div>

      {/* Liste des affiliations existantes */}
      {affiliations.length > 0 && (
        <div className="space-y-3 mb-6">
          {affiliations.map((aff) => (
            <div
              key={aff.id}
              className="bg-white border-2 border-gray-100 rounded-xl p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 size={18} className="text-brand-500" />
                    <span className="font-bold text-gray-900">
                      {getTypeLabel(aff.affiliation_type)}
                    </span>
                  </div>
                  {aff.affiliation_name && (
                    <p className="text-sm text-gray-600 mb-1">{aff.affiliation_name}</p>
                  )}
                  {aff.affiliation_number && (
                    <p className="text-xs text-gray-500">N° {aff.affiliation_number}</p>
                  )}
                  {aff.ninea && (
                    <p className="text-xs text-gray-500">NINEA: {aff.ninea}</p>
                  )}
                  {aff.rccm && (
                    <p className="text-xs text-gray-500">RCCM: {aff.rccm}</p>
                  )}
                </div>
                {getStatusBadge(aff.status)}
              </div>
              {aff.rejection_reason && (
                <p className="text-xs text-red-600 mt-2 bg-red-50 rounded p-2">
                  Raison du rejet : {aff.rejection_reason}
                </p>
              )}
              {aff.certificate_url && (
                <a
                  href={aff.certificate_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 mt-2"
                >
                  <FileText size={14} />
                  Voir le certificat
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formulaire pour nouvelle affiliation */}
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-brand-400 hover:bg-brand-50/50 transition-colors"
        >
          <Building2 size={24} className="text-gray-400 mx-auto mb-2" />
          <p className="font-bold text-gray-700">Ajouter une affiliation</p>
          <p className="text-xs text-gray-500 mt-1">Chambre de métier, incubateur, SAE...</p>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-900">Nouvelle affiliation</h3>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* Type d'affiliation */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Type d'organisme <span className="text-red-500">*</span>
            </label>
            <select
              value={affiliationType}
              onChange={(e) => {
                setAffiliationType(e.target.value as any);
                setSelectedChambre('');
                setAffiliationName('');
              }}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none bg-white"
              required
            >
              <option value="chambre">Chambre de Métier</option>
              <option value="incubateur">Incubateur</option>
              <option value="sae">SAE (Structure d'Accompagnement à l'Entrepreneuriat)</option>
              <option value="autre">Autre organisme</option>
            </select>
          </div>

          {/* Chambre de métier (si type = chambre) */}
          {affiliationType === 'chambre' && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Chambre de Métier <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedChambre}
                onChange={(e) => setSelectedChambre(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none bg-white"
                required
              >
                <option value="">Sélectionnez une chambre</option>
                {chambres.map((chambre) => (
                  <option key={chambre.id} value={chambre.id}>
                    {chambre.name} ({chambre.region})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nom de l'organisme (si type != chambre) */}
          {affiliationType !== 'chambre' && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Nom de l'organisme <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={affiliationName}
                onChange={(e) => setAffiliationName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none bg-white"
                placeholder="Ex: Incubateur Tech Hub Dakar"
                required
              />
            </div>
          )}

          {/* Numéro d'affiliation */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Numéro d'affiliation / Certificat
            </label>
            <input
              type="text"
              value={affiliationNumber}
              onChange={(e) => setAffiliationNumber(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none bg-white"
              placeholder="Ex: CM-DKR-2024-001"
            />
          </div>

          {/* Upload certificat */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Certificat d'affiliation (optionnel)
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                      showError('Le fichier ne doit pas dépasser 5MB');
                      return;
                    }
                    setCertificateFile(file);
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                {certificateFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                    <FileText size={18} className="text-brand-500" />
                    <span className="font-medium">{certificateFile.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCertificateFile(null);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload size={24} className="text-gray-400" />
                    <p className="text-sm font-medium text-gray-600">Cliquez pour uploader</p>
                    <p className="text-xs text-gray-400">JPG, PNG, PDF (max 5MB)</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Envoi...
                </>
              ) : (
                'Soumettre'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
