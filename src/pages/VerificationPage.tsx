import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Shield, Camera, FileText, Upload, CheckCircle, 
  Loader2, AlertCircle, User, CreditCard, Building2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';

type Step = 'intro' | 'selfie' | 'id' | 'business' | 'review';

export function VerificationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  
  const [currentStep, setCurrentStep] = useState<Step>('intro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [idCardUrl, setIdCardUrl] = useState<string | null>(null);
  const [idCardType, setIdCardType] = useState<string>('cni');
  const [nineaUrl, setNineaUrl] = useState<string | null>(null);
  const [nineaNumber, setNineaNumber] = useState('');
  const [registreUrl, setRegistreUrl] = useState<string | null>(null);
  const [registreNumber, setRegistreNumber] = useState('');

  // Upload file handler
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${folder}/${Date.now()}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from('photos')
        .upload(fileName, file);
      
      if (error) throw error;
      
      const { data } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);
      
      return data?.publicUrl || null;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    }
  };

  // Handle file input change
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string | null) => void,
    folder: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    const url = await uploadFile(file, folder);
    setter(url);
    setLoading(false);
  };

  // Submit verification
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Insert verification documents
      const { error: docError } = await supabase
        .from('verification_documents')
        .upsert({
          artisan_id: user?.id,
          selfie_url: selfieUrl,
          id_card_url: idCardUrl,
          id_card_type: idCardType,
          ninea_url: nineaUrl,
          ninea_number: nineaNumber || null,
          registre_commerce_url: registreUrl,
          registre_commerce_number: registreNumber || null,
          status: 'pending',
        });
      
      if (docError) throw docError;
      
      // Update artisan verification status
      const { error: artisanError } = await supabase
        .from('artisans')
        .update({ verification_status: 'pending' })
        .eq('id', user?.id);
      
      if (artisanError) throw artisanError;
      
      setCurrentStep('review');
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la soumission');
    }
    
    setLoading(false);
  };

  const steps = [
    { id: 'intro', title: 'Introduction' },
    { id: 'selfie', title: 'Photo' },
    { id: 'id', title: 'Identité' },
    { id: 'business', title: 'Documents' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => currentStep === 'intro' || currentStep === 'review' ? navigate('/dashboard') : setCurrentStep(steps[currentStepIndex - 1]?.id as Step)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">Vérification du compte</h1>
            {currentStep !== 'review' && currentStep !== 'intro' && (
              <p className="text-xs text-gray-400">
                Étape {currentStepIndex} sur {steps.length - 1}
              </p>
            )}
          </div>
        </div>
        
        {/* Progress bar */}
        {currentStep !== 'intro' && currentStep !== 'review' && (
          <div className="h-1 bg-gray-100">
            <div 
              className="h-full bg-brand-500 transition-all duration-300"
              style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
            />
          </div>
        )}
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        
        {/* INTRO */}
        {currentStep === 'intro' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Shield size={40} className="text-brand-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Devenez certifié
              </h2>
              <p className="text-gray-500">
                Gagnez en confiance et accédez à plus d'avantages
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
              <h3 className="font-bold text-gray-900">Avantages de la certification</h3>
              
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Badge vérifié</p>
                  <p className="text-xs text-gray-400">Inspirez confiance aux clients</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Avances sur paiement</p>
                  <p className="text-xs text-gray-400">Recevez jusqu'à 40% d'avance</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Crédit fournisseur</p>
                  <p className="text-xs text-gray-400">Accédez aux matériaux à crédit</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-4">Documents requis</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Camera size={18} className="text-gray-400" />
                  <span className="text-gray-600">Photo de vous (selfie)</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CreditCard size={18} className="text-gray-400" />
                  <span className="text-gray-600">Pièce d'identité (CNI, Passeport)</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <FileText size={18} className="text-gray-400" />
                  <span className="text-gray-600">NINEA (optionnel)</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Building2 size={18} className="text-gray-400" />
                  <span className="text-gray-600">Registre de commerce (optionnel)</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentStep('selfie')}
              className="w-full bg-brand-500 text-white rounded-2xl py-4 font-bold hover:bg-brand-600 transition-colors"
            >
              Commencer la vérification
            </button>
          </div>
        )}

        {/* SELFIE */}
        {currentStep === 'selfie' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Votre photo
              </h2>
              <p className="text-gray-500 text-sm">
                Prenez une photo claire de votre visage
              </p>
            </div>

            <div className="relative">
              {selfieUrl ? (
                <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100">
                  <img src={selfieUrl} alt="Selfie" className="w-full h-full object-cover" />
                </div>
              ) : (
                <label className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 bg-white flex flex-col items-center justify-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/50 transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(e) => handleFileUpload(e, setSelfieUrl, 'verification/selfie')}
                    className="hidden"
                  />
                  {loading ? (
                    <Loader2 size={40} className="text-brand-500 animate-spin" />
                  ) : (
                    <>
                      <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <User size={40} className="text-gray-400" />
                      </div>
                      <p className="font-bold text-gray-700">Prendre une photo</p>
                      <p className="text-xs text-gray-400 mt-1">ou choisir un fichier</p>
                    </>
                  )}
                </label>
              )}
              
              {selfieUrl && (
                <button
                  onClick={() => setSelfieUrl(null)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setCurrentStep('id')}
              disabled={!selfieUrl}
              className="w-full bg-brand-500 text-white rounded-2xl py-4 font-bold hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuer
            </button>
          </div>
        )}

        {/* ID CARD */}
        {currentStep === 'id' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Pièce d'identité
              </h2>
              <p className="text-gray-500 text-sm">
                Photo recto de votre document
              </p>
            </div>

            {/* ID Type Selection */}
            <div className="flex gap-2">
              {[
                { value: 'cni', label: 'CNI' },
                { value: 'passport', label: 'Passeport' },
                { value: 'permis', label: 'Permis' },
              ].map((type) => (
                <button
                  key={type.value}
                  onClick={() => setIdCardType(type.value)}
                  className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                    idCardType === type.value
                      ? 'bg-brand-500 text-white'
                      : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <div className="relative">
              {idCardUrl ? (
                <div className="aspect-video rounded-2xl overflow-hidden bg-gray-100">
                  <img src={idCardUrl} alt="ID Card" className="w-full h-full object-cover" />
                </div>
              ) : (
                <label className="aspect-video rounded-2xl border-2 border-dashed border-gray-200 bg-white flex flex-col items-center justify-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/50 transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setIdCardUrl, 'verification/id')}
                    className="hidden"
                  />
                  {loading ? (
                    <Loader2 size={40} className="text-brand-500 animate-spin" />
                  ) : (
                    <>
                      <CreditCard size={40} className="text-gray-400 mb-3" />
                      <p className="font-bold text-gray-700">Ajouter le document</p>
                    </>
                  )}
                </label>
              )}
              
              {idCardUrl && (
                <button
                  onClick={() => setIdCardUrl(null)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={() => setCurrentStep('business')}
              disabled={!idCardUrl}
              className="w-full bg-brand-500 text-white rounded-2xl py-4 font-bold hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuer
            </button>
          </div>
        )}

        {/* BUSINESS DOCUMENTS */}
        {currentStep === 'business' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Documents professionnels
              </h2>
              <p className="text-gray-500 text-sm">
                Optionnel mais recommandé
              </p>
            </div>

            {/* NINEA */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                <FileText size={20} className="text-gray-400" />
                <span className="font-bold text-gray-900">NINEA</span>
              </div>
              
              <input
                type="text"
                value={nineaNumber}
                onChange={(e) => setNineaNumber(e.target.value)}
                placeholder="Numéro NINEA"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none"
              />
              
              {nineaUrl ? (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                  <img src={nineaUrl} alt="NINEA" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setNineaUrl(null)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="block rounded-xl border border-dashed border-gray-200 p-4 text-center cursor-pointer hover:border-brand-300 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setNineaUrl, 'verification/ninea')}
                    className="hidden"
                  />
                  <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                  <p className="text-sm text-gray-500">Ajouter le document</p>
                </label>
              )}
            </div>

            {/* Registre de Commerce */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                <Building2 size={20} className="text-gray-400" />
                <span className="font-bold text-gray-900">Registre de Commerce</span>
              </div>
              
              <input
                type="text"
                value={registreNumber}
                onChange={(e) => setRegistreNumber(e.target.value)}
                placeholder="Numéro RC"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none"
              />
              
              {registreUrl ? (
                <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
                  <img src={registreUrl} alt="RC" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setRegistreUrl(null)}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="block rounded-xl border border-dashed border-gray-200 p-4 text-center cursor-pointer hover:border-brand-300 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setRegistreUrl, 'verification/rc')}
                    className="hidden"
                  />
                  <Upload size={20} className="mx-auto text-gray-400 mb-1" />
                  <p className="text-sm text-gray-500">Ajouter le document</p>
                </label>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-brand-500 text-white rounded-2xl py-4 font-bold hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                'Soumettre la vérification'
              )}
            </button>
          </div>
        )}

        {/* REVIEW CONFIRMATION */}
        {currentStep === 'review' && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-500 text-center">
            <div className="w-24 h-24 bg-green-100 rounded-full mx-auto flex items-center justify-center">
              <CheckCircle size={48} className="text-green-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900">
              Demande envoyée !
            </h2>
            <p className="text-gray-500">
              Nous examinons vos documents. Vous recevrez une notification une fois la vérification terminée.
            </p>
            
            <div className="bg-blue-50 rounded-2xl p-4">
              <p className="text-sm text-blue-600">
                Délai estimé : 24-48 heures
              </p>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gray-900 text-white rounded-2xl py-4 font-bold hover:bg-gray-800 transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
