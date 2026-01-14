import React, { useEffect, useState } from 'react';
import { 
  Search, Shield, CheckCircle, XCircle, Clock, User, 
  FileText, Phone, MapPin, Briefcase, Award, AlertCircle,
  Camera, CreditCard, Building2, ExternalLink, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface VerificationDocument {
  id: string;
  artisan_id: string;
  selfie_url: string | null;
  id_card_url: string | null;
  id_card_type: string | null;
  ninea_url: string | null;
  ninea_number: string | null;
  registre_commerce_url: string | null;
  registre_commerce_number: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

interface ArtisanVerification {
  id: string;
  user_id: string;
  is_verified: boolean;
  verification_status: string;
  certification_number: string | null;
  experience_years: number | null;
  created_at: string;
  verification_documents: VerificationDocument | null;
  profiles: {
    full_name: string;
    email: string;
    phone: string | null;
    location: string | null;
    avatar_url: string | null;
    category_id: number | null;
    specialty: string | null;
    bio: string | null;
  } | null;
  categories: { name: string } | null;
}

export function AdminVerifications() {
  const [artisans, setArtisans] = useState<ArtisanVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedArtisan, setSelectedArtisan] = useState<ArtisanVerification | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchArtisans();
  }, []);

  const fetchArtisans = async () => {
    setLoading(true);
    
    // Get artisans with their profiles and verification documents
    const { data: artisanData, error: artisanError } = await supabase
      .from('artisans')
      .select(`
        id, is_verified, verification_status, certification_number, experience_years, created_at,
        profiles!artisans_id_fkey (
          id, full_name, email, phone, location, avatar_url, specialty, bio,
          categories (name)
        )
      `)
      .order('created_at', { ascending: false }) as { data: any[], error: any };
    
    if (artisanError) {
      console.error('Error fetching artisans:', artisanError);
      setLoading(false);
      return;
    }

    // Get verification documents for each artisan
    const { data: docsData } = await supabase
      .from('verification_documents')
      .select('*');
    
    // Merge the data
    const mergedData = artisanData?.map(artisan => {
      const docs = docsData?.find(d => d.artisan_id === artisan.id);
      return {
        id: artisan.id,
        user_id: artisan.id,
        is_verified: artisan.is_verified || false,
        verification_status: artisan.verification_status || 'unverified',
        certification_number: artisan.certification_number || null,
        experience_years: artisan.experience_years || null,
        created_at: artisan.created_at,
        verification_documents: docs || null,
        profiles: artisan.profiles,
        categories: artisan.profiles?.categories || null,
      };
    }) || [];
    
    setArtisans(mergedData);
    setLoading(false);
  };

  const filteredArtisans = artisans.filter(artisan => {
    const matchesSearch = 
      artisan.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artisan.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'verified' && artisan.verification_status === 'verified') ||
      (statusFilter === 'pending' && artisan.verification_status === 'pending') ||
      (statusFilter === 'unverified' && artisan.verification_status === 'unverified');
    return matchesSearch && matchesStatus;
  });

  const pendingCount = artisans.filter(a => a.verification_status === 'pending').length;
  const verifiedCount = artisans.filter(a => a.verification_status === 'verified').length;
  const unverifiedCount = artisans.filter(a => a.verification_status === 'unverified').length;

  const handleVerify = async (artisanId: string) => {
    try {
      // Update artisan status
      await supabase
        .from('artisans')
        .update({ 
          is_verified: true, 
          verification_status: 'verified',
          can_receive_advance: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', artisanId);
      
      // Update verification documents status
      await supabase
        .from('verification_documents')
        .update({ status: 'approved' })
        .eq('artisan_id', artisanId);
      
      // Send notification to artisan
      await supabase.from('notifications').insert({
        user_id: artisanId,
        type: 'verification_approved',
        title: 'Félicitations ! Vous êtes certifié',
        message: 'Votre compte a été vérifié. Vous bénéficiez maintenant du badge certifié et pouvez recevoir des avances sur paiement.',
        data: {},
      });
      
      fetchArtisans();
      setSelectedArtisan(null);
    } catch (err) {
      console.error('Error verifying artisan:', err);
    }
  };

  const handleReject = async (artisanId: string) => {
    try {
      // Update artisan status
      await supabase
        .from('artisans')
        .update({ 
          is_verified: false, 
          verification_status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', artisanId);
      
      // Update verification documents status with rejection reason
      await supabase
        .from('verification_documents')
        .update({ 
          status: 'rejected',
          rejection_reason: rejectionReason || 'Documents non conformes'
        })
        .eq('artisan_id', artisanId);
      
      // Send notification to artisan
      await supabase.from('notifications').insert({
        user_id: artisanId,
        type: 'verification_rejected',
        title: 'Vérification refusée',
        message: rejectionReason || 'Vos documents n\'ont pas pu être validés. Veuillez soumettre de nouveaux documents.',
        data: {},
      });
      
      fetchArtisans();
      setSelectedArtisan(null);
      setRejectionReason('');
    } catch (err) {
      console.error('Error rejecting artisan:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`p-5 rounded-2xl border transition-all ${
            statusFilter === 'all' ? 'border-brand-500 bg-brand-50' : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <User size={20} className="text-gray-600" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-black text-gray-900">{artisans.length}</p>
              <p className="text-xs font-bold text-gray-500">Total</p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => setStatusFilter('pending')}
          className={`p-5 rounded-2xl border transition-all relative ${
            statusFilter === 'pending' ? 'border-brand-500 bg-brand-50' : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          {pendingCount > 0 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{pendingCount}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock size={20} className="text-yellow-600" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-black text-gray-900">{pendingCount}</p>
              <p className="text-xs font-bold text-gray-500">En attente</p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => setStatusFilter('verified')}
          className={`p-5 rounded-2xl border transition-all ${
            statusFilter === 'verified' ? 'border-brand-500 bg-brand-50' : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-green-600" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-black text-gray-900">{verifiedCount}</p>
              <p className="text-xs font-bold text-gray-500">Certifiés</p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => setStatusFilter('unverified')}
          className={`p-5 rounded-2xl border transition-all ${
            statusFilter === 'unverified' ? 'border-brand-500 bg-brand-50' : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <User size={20} className="text-gray-400" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-black text-gray-900">{unverifiedCount}</p>
              <p className="text-xs font-bold text-gray-500">Non vérifiés</p>
            </div>
          </div>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un artisan..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none"
        />
      </div>

      {/* Artisans List */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="px-6 py-12 text-center text-gray-400">
              <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredArtisans.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">
              {statusFilter === 'pending' ? 'Aucune vérification en attente' : 'Aucun artisan trouvé'}
            </div>
          ) : (
            filteredArtisans.map((artisan) => {
              const hasDocuments = artisan.verification_documents !== null;
              const statusConfig = {
                verified: { label: 'Certifié', color: 'bg-green-100 text-green-700' },
                pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
                rejected: { label: 'Refusé', color: 'bg-red-100 text-red-700' },
                unverified: { label: 'Non vérifié', color: 'bg-gray-100 text-gray-500' },
              }[artisan.verification_status] || { label: 'Inconnu', color: 'bg-gray-100 text-gray-500' };
              
              return (
                <div
                  key={artisan.user_id}
                  className={`p-6 hover:bg-gray-50 transition-colors cursor-pointer ${
                    artisan.verification_status === 'pending' ? 'bg-yellow-50/50' : ''
                  }`}
                  onClick={() => setSelectedArtisan(artisan)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden relative">
                      {artisan.profiles?.avatar_url ? (
                        <img src={artisan.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={24} className="text-brand-600" />
                      )}
                      {artisan.verification_status === 'verified' && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                          <CheckCircle size={12} className="text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-bold text-gray-900">{artisan.profiles?.full_name}</h4>
                        <span className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                        {hasDocuments && artisan.verification_status === 'pending' && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full uppercase flex items-center gap-1">
                            <FileText size={10} />
                            Documents soumis
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{artisan.categories?.name || artisan.profiles?.specialty || 'Non spécifié'}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        {artisan.profiles?.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} />
                            {artisan.profiles.location}
                          </span>
                        )}
                        {artisan.profiles?.phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} />
                            {artisan.profiles.phone}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs text-gray-400">
                        Inscrit le {new Date(artisan.created_at).toLocaleDateString('fr-FR')}
                      </p>
                      {hasDocuments && (
                        <p className="text-xs text-blue-500 font-bold mt-1">
                          Voir les documents →
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Artisan Details Modal */}
      {selectedArtisan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden relative">
                  {selectedArtisan.profiles?.avatar_url ? (
                    <img src={selectedArtisan.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={28} className="text-brand-600" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">{selectedArtisan.profiles?.full_name}</h3>
                  <p className="text-sm text-gray-500">{selectedArtisan.profiles?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedArtisan(null)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {selectedArtisan.verification_status === 'verified' ? (
                  <span className="inline-flex items-center gap-1 px-4 py-2 bg-green-100 text-green-700 text-sm font-black rounded-full">
                    <Shield size={16} /> Certifié
                  </span>
                ) : selectedArtisan.verification_status === 'pending' ? (
                  <span className="inline-flex items-center gap-1 px-4 py-2 bg-yellow-100 text-yellow-700 text-sm font-black rounded-full">
                    <Clock size={16} /> En attente de vérification
                  </span>
                ) : selectedArtisan.verification_status === 'rejected' ? (
                  <span className="inline-flex items-center gap-1 px-4 py-2 bg-red-100 text-red-700 text-sm font-black rounded-full">
                    <XCircle size={16} /> Refusé
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-600 text-sm font-black rounded-full">
                    <User size={16} /> Non vérifié
                  </span>
                )}
              </div>

              {/* Basic Info */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Briefcase size={18} className="text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-400 uppercase">Métier</p>
                      <p className="font-bold text-gray-900">{selectedArtisan.categories?.name || 'Non spécifié'}</p>
                    </div>
                  </div>
                  {selectedArtisan.profiles?.location && (
                    <div className="flex items-center gap-3">
                      <MapPin size={18} className="text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400 uppercase">Localisation</p>
                        <p className="font-bold text-gray-900">{selectedArtisan.profiles.location}</p>
                      </div>
                    </div>
                  )}
                  {selectedArtisan.profiles?.phone && (
                    <div className="flex items-center gap-3">
                      <Phone size={18} className="text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400 uppercase">Téléphone</p>
                        <p className="font-bold text-gray-900">{selectedArtisan.profiles.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* DOCUMENTS DE VÉRIFICATION */}
              {selectedArtisan.verification_documents ? (
                <div className="space-y-4">
                  <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest flex items-center gap-2">
                    <FileText size={14} />
                    Documents soumis
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Selfie */}
                    {selectedArtisan.verification_documents.selfie_url && (
                      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                          <Camera size={16} className="text-blue-500" />
                          Photo (Selfie)
                        </div>
                        <button
                          onClick={() => setImagePreview(selectedArtisan.verification_documents!.selfie_url)}
                          className="relative w-full aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
                        >
                          <img 
                            src={selectedArtisan.verification_documents.selfie_url} 
                            alt="Selfie" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors">
                            <ExternalLink size={24} className="text-white opacity-0 hover:opacity-100" />
                          </div>
                        </button>
                      </div>
                    )}
                    
                    {/* ID Card */}
                    {selectedArtisan.verification_documents.id_card_url && (
                      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                          <CreditCard size={16} className="text-purple-500" />
                          Pièce d'identité ({selectedArtisan.verification_documents.id_card_type?.toUpperCase() || 'CNI'})
                        </div>
                        <button
                          onClick={() => setImagePreview(selectedArtisan.verification_documents!.id_card_url)}
                          className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
                        >
                          <img 
                            src={selectedArtisan.verification_documents.id_card_url} 
                            alt="ID Card" 
                            className="w-full h-full object-cover"
                          />
                        </button>
                      </div>
                    )}
                    
                    {/* NINEA */}
                    {selectedArtisan.verification_documents.ninea_url && (
                      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                          <FileText size={16} className="text-green-500" />
                          NINEA
                          {selectedArtisan.verification_documents.ninea_number && (
                            <span className="text-xs text-gray-400 font-mono">
                              ({selectedArtisan.verification_documents.ninea_number})
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setImagePreview(selectedArtisan.verification_documents!.ninea_url)}
                          className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
                        >
                          <img 
                            src={selectedArtisan.verification_documents.ninea_url} 
                            alt="NINEA" 
                            className="w-full h-full object-cover"
                          />
                        </button>
                      </div>
                    )}
                    
                    {/* Registre de Commerce */}
                    {selectedArtisan.verification_documents.registre_commerce_url && (
                      <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                          <Building2 size={16} className="text-orange-500" />
                          Registre Commerce
                          {selectedArtisan.verification_documents.registre_commerce_number && (
                            <span className="text-xs text-gray-400 font-mono">
                              ({selectedArtisan.verification_documents.registre_commerce_number})
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setImagePreview(selectedArtisan.verification_documents!.registre_commerce_url)}
                          className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100 hover:opacity-90 transition-opacity"
                        >
                          <img 
                            src={selectedArtisan.verification_documents.registre_commerce_url} 
                            alt="RC" 
                            className="w-full h-full object-cover"
                          />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-6 text-center">
                  <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500 font-medium">Aucun document soumis</p>
                  <p className="text-xs text-gray-400">L'artisan n'a pas encore envoyé de demande de vérification</p>
                </div>
              )}

              {/* Actions */}
              {selectedArtisan.verification_status === 'pending' && selectedArtisan.verification_documents && (
                <div className="space-y-4 border-t pt-6">
                  <h4 className="font-black text-gray-900 uppercase text-xs tracking-widest">Actions de vérification</h4>
                  
                  {/* Rejection Reason Input */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                      Raison du refus (si applicable)
                    </label>
                    <input
                      type="text"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Ex: Photo floue, document expiré..."
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleVerify(selectedArtisan.user_id)}
                      className="flex items-center justify-center gap-2 py-4 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-colors"
                    >
                      <CheckCircle size={20} />
                      Approuver
                    </button>
                    <button
                      onClick={() => handleReject(selectedArtisan.user_id)}
                      className="flex items-center justify-center gap-2 py-4 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                    >
                      <XCircle size={20} />
                      Rejeter
                    </button>
                  </div>
                </div>
              )}

              {selectedArtisan.verification_status === 'verified' && (
                <div className="p-4 bg-green-50 rounded-xl flex items-center gap-3">
                  <Shield className="text-green-500" size={24} />
                  <div>
                    <p className="font-bold text-green-700">Artisan certifié</p>
                    <p className="text-sm text-green-600">Ce professionnel bénéficie du badge certifié et des avantages associés.</p>
                  </div>
                </div>
              )}

              {selectedArtisan.verification_status === 'rejected' && selectedArtisan.verification_documents?.rejection_reason && (
                <div className="p-4 bg-red-50 rounded-xl">
                  <p className="font-bold text-red-700 text-sm mb-1">Raison du refus</p>
                  <p className="text-red-600">{selectedArtisan.verification_documents.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {imagePreview && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4">
          <button
            onClick={() => setImagePreview(null)}
            className="absolute top-4 right-4 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20"
          >
            <X size={24} />
          </button>
          <img 
            src={imagePreview} 
            alt="Preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
