import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Briefcase, User as UserIcon, Check, MapPin, Phone, 
  Upload, X, Image, Loader2, ArrowRight, ArrowLeft, 
  Sparkles, CheckCircle, Search, ChevronDown
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile, type ProfileRole } from '../hooks/useProfile';
import { useDiscovery } from '../hooks/useDiscovery';
import { supabase } from '../lib/supabase';

// Total steps: Client = 3, Artisan = 6 (ajout de l'affiliation chambre de métier)
const CLIENT_STEPS = 3;
const ARTISAN_STEPS = 6;

// Searchable Category Select Component
interface Category {
  id: number;
  name: string;
}

interface SearchableCategorySelectProps {
  categories: Category[];
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}

function SearchableCategorySelect({ categories, value, onChange }: SearchableCategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const selectedCategory = categories.find(cat => cat.id === value);
  
  return (
    <div className="relative">
      {/* Selected Value / Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full rounded-2xl border-2 px-5 py-4 text-left flex items-center justify-between transition-all bg-white ${
          isOpen ? 'border-brand-500 ring-4 ring-brand-100' : 'border-gray-100 hover:border-gray-200'
        }`}
      >
        <span className={`text-lg font-medium ${selectedCategory ? 'text-gray-900' : 'text-gray-400'}`}>
          {selectedCategory ? selectedCategory.name : 'Rechercher un métier...'}
        </span>
        <ChevronDown 
          size={22} 
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl border-2 border-gray-100 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tapez pour rechercher..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-base focus:outline-none focus:bg-gray-100 transition-colors"
                autoFocus
              />
            </div>
          </div>
          
          {/* Results List */}
          <div className="max-h-64 overflow-auto">
            {filteredCategories.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400">
                <Search size={32} className="mx-auto mb-2 opacity-50" />
                <p className="font-medium">Aucun métier trouvé</p>
                <p className="text-sm">Essayez un autre terme</p>
              </div>
            ) : (
              filteredCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    onChange(cat.id);
                    setIsOpen(false);
                    setSearchQuery('');
                  }}
                  className={`w-full px-5 py-3 text-left flex items-center gap-3 hover:bg-brand-50 transition-colors ${
                    value === cat.id ? 'bg-brand-50 text-brand-600' : 'text-gray-700'
                  }`}
                >
                  {value === cat.id && (
                    <CheckCircle size={18} className="text-brand-500" />
                  )}
                  <span className={`font-medium ${value === cat.id ? 'text-brand-600' : ''}`}>
                    {cat.name}
                  </span>
                </button>
              ))
            )}
          </div>
          
          {/* Results count */}
          {filteredCategories.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                {filteredCategories.length} métier{filteredCategories.length > 1 ? 's' : ''} trouvé{filteredCategories.length > 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsOpen(false);
            setSearchQuery('');
          }}
        />
      )}
    </div>
  );
}

export function ProfileSetupPage() {
  const auth = useAuth();
  const { profile, loading: profileLoading, upsertProfile } = useProfile();
  const { categories } = useDiscovery();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Check if artisan role was passed from login
  const preferredRole = searchParams.get('role') as ProfileRole | null;

  // Current step (1-indexed)
  const [currentStep, setCurrentStep] = useState(1);
  
  // Role confirmation animation
  const [showRoleConfirmation, setShowRoleConfirmation] = useState(false);
  
  // Form data
  const [role, setRole] = useState<ProfileRole | null>(preferredRole === 'artisan' ? 'artisan' : null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [bio, setBio] = useState('');
  const [specialty, setSpecialty] = useState('');
  
  // Affiliation data (chambre de métier, incubateur, SAE)
  const [hasAffiliation, setHasAffiliation] = useState<boolean | null>(null); // null = pas encore répondu
  const [affiliationType, setAffiliationType] = useState<'chambre' | 'incubateur' | 'sae' | 'autre' | null>(null);
  const [chambreId, setChambreId] = useState<string | null>(null);
  const [affiliationName, setAffiliationName] = useState('');
  const [affiliationNumber, setAffiliationNumber] = useState('');
  const [chambresMetier, setChambresMetier] = useState<any[]>([]);
  
  // Geolocation states
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [exactAddress, setExactAddress] = useState('');
  
  // Portfolio states
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Form states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const senegalRegions = [
    'Dakar', 'Thiès', 'Saint-Louis', 'Diourbel', 'Kaolack', 'Ziguinchor',
    'Louga', 'Fatick', 'Kolda', 'Matam', 'Kaffrine', 'Kédougou', 'Sédhiou', 'Tambacounda'
  ];

  // Calculate total steps based on role
  const totalSteps = role === 'artisan' ? ARTISAN_STEPS : CLIENT_STEPS;

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.user) {
      navigate('/login', { replace: true });
      return;
    }
  }, [auth.loading, auth.user, navigate]);

  // Fonction pour vérifier si le profil est complet
  const isProfileComplete = (profile: any): boolean => {
    if (!profile) return false;
    
    // Champs absolument requis pour tous les rôles
    const requiredFields = ['role', 'full_name', 'location'];
    const hasRequiredFields = requiredFields.every(
      field => profile[field] && profile[field].toString().trim().length > 0
    );
    
    if (!hasRequiredFields) return false;
    
    // Pour les artisans, vérifier aussi category_id
    if (profile.role === 'artisan' && !profile.category_id) {
      return false;
    }
    
    return true;
  };

  useEffect(() => {
    if (!auth.user) return;
    if (profileLoading) return;
    
    // Vérifier que le profil est vraiment complet avant de rediriger
    if (profile && isProfileComplete(profile)) {
      navigate('/dashboard', { replace: true });
    }
  }, [auth.user, profile, profileLoading, navigate]);

  useEffect(() => {
    const fromProviderName =
      (auth.user?.user_metadata?.full_name as string | undefined) ||
      (auth.user?.user_metadata?.name as string | undefined) ||
      '';

    setFullName((n) => n || fromProviderName);
  }, [auth.user]);

  // Auto-advance to step 2 if role is pre-selected
  useEffect(() => {
    if (preferredRole && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [preferredRole]);

  // Handle role selection (with confirmation animation)
  const handleRoleSelect = (selectedRole: ProfileRole) => {
    setRole(selectedRole);
    setShowRoleConfirmation(true);
    
    // Show confirmation for 1.5s then advance
    setTimeout(() => {
      setShowRoleConfirmation(false);
      setCurrentStep(2);
    }, 1500);
  };

  // Geolocation handler
  const handleGeolocation = async () => {
    setGeoLoading(true);
    setGeoError(null);
    
    if (!navigator.geolocation) {
      setGeoError('La géolocalisation n\'est pas supportée');
      setGeoLoading(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=fr`
          );
          const data = await response.json();
          
          if (data && data.address) {
            const { city, town, village, suburb, state, road, house_number } = data.address;
            const locality = city || town || village || suburb || '';
            const region = state || '';
            
            const addressParts = [house_number, road, locality].filter(Boolean);
            setExactAddress(addressParts.join(', '));
            
            const matchedRegion = senegalRegions.find(r => 
              region.toLowerCase().includes(r.toLowerCase()) ||
              locality.toLowerCase().includes(r.toLowerCase())
            );
            
            if (matchedRegion) {
              setLocation(matchedRegion);
            }
          }
        } catch (err) {
          setGeoError('Impossible de récupérer l\'adresse');
        }
        
        setGeoLoading(false);
      },
      (error) => {
        setGeoLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError('Accès refusé');
            break;
          default:
            setGeoError('Erreur de localisation');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Portfolio upload handler
  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingImage(true);
    
    try {
      const newImages: string[] = [];
      
      for (const file of Array.from(files)) {
        if (!(file instanceof File) || !file.type.startsWith('image/')) continue;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${auth.user?.id}/portfolio/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
          const { error } = await supabase.storage
            .from('photos')
            .upload(fileName, file);
          
          if (error) continue;
          
          const { data: urlData } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);
        
        if (urlData?.publicUrl) {
          newImages.push(urlData.publicUrl);
        }
      }
      
      setPortfolioImages(prev => [...prev, ...newImages]);
    } catch (err) {
      setError('Erreur lors de l\'upload');
    }
    
    setUploadingImage(false);
    e.target.value = '';
  };

  const removePortfolioImage = (index: number) => {
    setPortfolioImages(prev => prev.filter((_, i) => i !== index));
  };

  // Navigation handlers
  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Check if current step is valid
  const isStepValid = () => {
    switch (currentStep) {
      case 1: return !!role;
      case 2: return fullName.trim().length > 0 && phone.trim().length > 0;
      case 3: return location.length > 0;
      case 4: 
        // Step 4 pour artisan: Affiliation (optionnelle mais doit répondre)
        if (role === 'client') return true;
        if (hasAffiliation === null) return false; // Doit avoir répondu
        // Si oui, vérifier qu'un type est sélectionné
        if (hasAffiliation === true) {
          if (!affiliationType) return false;
          if (affiliationType === 'chambre' && !chambreId) return false;
          if (affiliationType !== 'chambre' && !affiliationName.trim()) return false;
        }
        return true;
      case 5: return role === 'client' || (categoryId !== undefined);
      case 6: return true; // Portfolio is optional
      default: return false;
    }
  };

  // Submit handler
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await upsertProfile({
        role: role!,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        location: location.trim() || null,
        category_id: role === 'artisan' ? categoryId : undefined,
        bio: role === 'artisan' ? bio.trim() : undefined,
        specialty: role === 'artisan' ? specialty.trim() : undefined,
        portfolio_urls: role === 'artisan' ? portfolioImages : undefined,
      });
      
      // Si artisan avec affiliation, créer l'affiliation
      if (role === 'artisan' && hasAffiliation && affiliationType && auth.user) {
        const affiliationData: any = {
          artisan_id: auth.user.id,
          affiliation_type: affiliationType,
          status: 'pending',
        };
        
        if (affiliationType === 'chambre' && chambreId) {
          affiliationData.chambre_id = chambreId;
        } else {
          affiliationData.affiliation_name = affiliationName.trim() || null;
          affiliationData.affiliation_number = affiliationNumber.trim() || null;
        }
        
        // Note: artisan_affiliations table exists but types not regenerated yet
        // Using type assertion temporarily
        const { error: affiliationError } = await (supabase as any)
          .from('artisan_affiliations')
          .insert(affiliationData);
        
        if (affiliationError) {
          console.error('Erreur lors de la création de l\'affiliation:', affiliationError);
          // Ne pas bloquer l'inscription si l'affiliation échoue
        }
      }
      
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de la création du profil');
      setLoading(false);
    }
  };

  // Step titles (personalized based on role)
  const getStepTitles = () => {
    if (role === 'artisan') {
      return {
        1: { title: 'Vous êtes...', subtitle: 'Choisissez votre profil' },
        2: { title: 'Enchanté ! 👋', subtitle: 'Comment vous appelez-vous ?' },
        3: { title: 'Votre zone', subtitle: 'Où exercez-vous votre métier ?' },
        4: { title: 'Votre affiliation', subtitle: 'Êtes-vous affilié à une chambre de métiers ?' },
        5: { title: 'Votre expertise', subtitle: 'Parlez-nous de votre savoir-faire' },
        6: { title: 'Votre portfolio', subtitle: 'Montrez vos plus belles réalisations' },
      };
    }
    return {
      1: { title: 'Vous êtes...', subtitle: 'Choisissez votre profil' },
      2: { title: 'Enchanté ! 👋', subtitle: 'Comment vous appelez-vous ?' },
      3: { title: 'Votre localisation', subtitle: 'Où souhaitez-vous trouver un artisan ?' },
    };
  };
  
  const stepTitles = getStepTitles();

  // Écran de chargement pendant la vérification d'authentification
  if (auth.loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FDFCFB] via-white to-orange-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFCFB] via-white to-orange-50/30 flex flex-col">
      {/* Header */}
      <header className={`px-6 py-4 flex items-center justify-between transition-opacity duration-300 ${showRoleConfirmation ? 'opacity-0' : 'opacity-100'}`}>
        {currentStep > 1 ? (
          <button 
            onClick={prevStep}
            className="flex items-center gap-2 text-gray-500 hover:text-brand-600 font-bold text-sm transition-colors"
          >
            <ArrowLeft size={18} />
            Retour
          </button>
        ) : (
          <Link 
            to="/landing"
            className="flex items-center gap-2 text-gray-500 hover:text-brand-600 font-bold text-sm transition-colors"
          >
            <ArrowLeft size={18} />
            Accueil
          </Link>
        )}
        
        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
            <div
              key={step}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                step === currentStep
                  ? 'w-8 bg-brand-500'
                  : step < currentStep
                  ? 'bg-brand-500'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        
        <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
          {currentStep}/{totalSteps}
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-6 py-8 flex flex-col">
        {/* Step Title */}
        {!showRoleConfirmation && (
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-black text-gray-900 mb-2">
              {stepTitles[currentStep]?.title}
            </h1>
            <p className="text-gray-500 font-medium">
              {stepTitles[currentStep]?.subtitle}
            </p>
          </div>
        )}

        {/* Step Content */}
        <div className="flex-1 flex flex-col">
          {/* Step 1: Role Selection */}
          {currentStep === 1 && !showRoleConfirmation && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <button
                type="button"
                onClick={() => handleRoleSelect('client')}
                className={`w-full relative group rounded-3xl border-2 p-6 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  role === 'client'
                    ? 'border-brand-500 bg-brand-50 ring-4 ring-brand-100'
                    : 'border-gray-100 bg-white hover:border-brand-200 hover:shadow-lg'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    role === 'client' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-brand-100 group-hover:text-brand-500'
                  }`}>
                    <UserIcon size={32} />
                  </div>
                  <div className="flex-1">
                    <div className={`font-black text-lg ${role === 'client' ? 'text-brand-900' : 'text-gray-900'}`}>
                      Je suis Client
                    </div>
                    <div className="text-sm text-gray-500">
                      Je cherche un artisan pour mon projet
                  </div>
                  </div>
                  {role === 'client' && (
                    <div className="w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center">
                      <Check size={18} />
                    </div>
                  )}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleRoleSelect('artisan')}
                className={`w-full relative group rounded-3xl border-2 p-6 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  role === 'artisan'
                    ? 'border-brand-500 bg-brand-50 ring-4 ring-brand-100'
                    : 'border-gray-100 bg-white hover:border-brand-200 hover:shadow-lg'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    role === 'artisan' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-brand-100 group-hover:text-brand-500'
                  }`}>
                    <Briefcase size={32} />
                  </div>
                  <div className="flex-1">
                    <div className={`font-black text-lg ${role === 'artisan' ? 'text-brand-900' : 'text-gray-900'}`}>
                      Je suis Artisan
                    </div>
                    <div className="text-sm text-gray-500">
                      Je propose mes services et mon savoir-faire
                  </div>
                  </div>
                  {role === 'artisan' && (
                    <div className="w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center">
                      <Check size={18} />
                    </div>
                  )}
                </div>
              </button>
            </div>
          )}
          
          {/* Role Confirmation Animation */}
          {showRoleConfirmation && role && (
            <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in-50 fade-in duration-500">
              {/* Animated Circle */}
              <div className="relative mb-8">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-2xl shadow-brand-200 animate-pulse">
                  {role === 'client' ? (
                    <UserIcon size={56} className="text-white" />
                  ) : (
                    <Briefcase size={56} className="text-white" />
                  )}
                </div>
                {/* Success checkmark */}
                <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-300 delay-300">
                  <CheckCircle size={28} className="text-white" />
                </div>
                {/* Sparkles */}
                <div className="absolute -top-4 -left-4 animate-bounce delay-100">
                  <Sparkles size={24} className="text-yellow-400" />
                </div>
                <div className="absolute -top-2 right-0 animate-bounce delay-200">
                  <Sparkles size={20} className="text-brand-400" />
                </div>
                <div className="absolute bottom-0 -left-6 animate-bounce delay-300">
                  <Sparkles size={18} className="text-green-400" />
                </div>
              </div>
              
              {/* Personalized Message */}
              <h2 className="text-2xl font-black text-gray-900 text-center mb-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                {role === 'client' ? (
                  <>Parfait ! 🎯</>
                ) : (
                  <>Bienvenue, Artisan ! 🔧</>
                )}
              </h2>
              <p className="text-gray-500 text-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                {role === 'client' ? (
                  <>Trouvons l'artisan idéal pour votre projet</>
                ) : (
                  <>Valorisons ensemble votre savoir-faire</>
                )}
              </p>
              
              {/* Loading dots */}
              <div className="flex items-center gap-2 mt-8 animate-in fade-in duration-500 delay-500">
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* Step 2: Identity */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  Nom complet
                </label>
              <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-lg font-medium focus:border-brand-500 focus:outline-none transition-all bg-white"
                  placeholder="Ex: Moussa Diop"
                  autoFocus
              />
            </div>

            <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  <Phone size={12} className="inline mr-1" />
                  Numéro de téléphone
                </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-lg font-medium focus:border-brand-500 focus:outline-none transition-all bg-white"
                  placeholder="77 123 45 67"
                  type="tel"
                />
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  <MapPin size={12} className="inline mr-1" />
                  Région
                </label>
                
                <div className="flex gap-3 mb-3">
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="flex-1 rounded-2xl border-2 border-gray-100 px-5 py-4 text-lg font-medium focus:border-brand-500 focus:outline-none transition-all bg-white appearance-none"
                  >
                    <option value="">Sélectionnez...</option>
                    {senegalRegions.map((region) => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                  
                  <button
                    type="button"
                    onClick={handleGeolocation}
                    disabled={geoLoading}
                    className="px-5 py-4 bg-brand-500 text-white rounded-2xl hover:bg-brand-600 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center"
                    title="Détecter ma position"
                  >
                    {geoLoading ? (
                      <Loader2 size={24} className="animate-spin" />
                    ) : (
                      <MapPin size={24} />
                    )}
                  </button>
                </div>
                
                {exactAddress && (
                  <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 animate-in fade-in">
                    <div className="flex items-center gap-2 text-green-700">
                      <CheckCircle size={18} />
                      <span className="font-bold text-sm">{exactAddress}</span>
                    </div>
                  </div>
                )}
                
                {geoError && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-red-600 text-sm font-medium animate-in fade-in">
                    {geoError}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Affiliation (Artisan only) */}
          {currentStep === 4 && role === 'artisan' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-6">
                <p className="text-gray-600 text-sm leading-relaxed">
                  L'affiliation à une chambre de métiers, un incubateur ou un SAE n'est pas obligatoire mais permet une vérification accélérée de votre compte.
                </p>
              </div>
              
              {/* Question principale */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                  Êtes-vous affilié ?
                </label>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setHasAffiliation(true);
                      setAffiliationType(null);
                      setChambreId(null);
                      setAffiliationName('');
                      setAffiliationNumber('');
                    }}
                    className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
                      hasAffiliation === true
                        ? 'border-brand-500 bg-brand-50 ring-4 ring-brand-100'
                        : 'border-gray-100 hover:border-brand-200'
                    }`}
                  >
                    <div className="font-bold text-gray-900">Oui, je suis affilié</div>
                    <div className="text-sm text-gray-500 mt-1">Chambre de métiers, incubateur ou SAE</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setHasAffiliation(false);
                      setAffiliationType(null);
                      setChambreId(null);
                      setAffiliationName('');
                      setAffiliationNumber('');
                    }}
                    className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${
                      hasAffiliation === false
                        ? 'border-brand-500 bg-brand-50 ring-4 ring-brand-100'
                        : 'border-gray-100 hover:border-brand-200'
                    }`}
                  >
                    <div className="font-bold text-gray-900">Non, je ne suis pas affilié</div>
                    <div className="text-sm text-gray-500 mt-1">Je continuerai sans affiliation</div>
                  </button>
                </div>
              </div>
              
              {/* Formulaire d'affiliation si oui */}
              {hasAffiliation === true && (
                <div className="space-y-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                      Type d'affiliation
                    </label>
                    <select
                      value={affiliationType || ''}
                      onChange={(e) => {
                        const type = e.target.value as 'chambre' | 'incubateur' | 'sae' | 'autre' | '';
                        setAffiliationType(type || null);
                        setChambreId(null);
                        setAffiliationName('');
                        setAffiliationNumber('');
                      }}
                      className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-base font-medium focus:border-brand-500 focus:outline-none transition-all bg-white"
                    >
                      <option value="">Sélectionnez...</option>
                      <option value="chambre">Chambre de Métiers</option>
                      <option value="incubateur">Incubateur</option>
                      <option value="sae">SAE (Structure d'Appui à l'Entrepreneuriat)</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                  
                  {/* Si chambre de métiers */}
                  {affiliationType === 'chambre' && (
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                        Chambre de Métiers
                      </label>
                      <select
                        value={chambreId || ''}
                        onChange={(e) => setChambreId(e.target.value || null)}
                        className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-base font-medium focus:border-brand-500 focus:outline-none transition-all bg-white"
                      >
                        <option value="">Sélectionnez votre région...</option>
                        {chambresMetier.map((chambre) => (
                          <option key={chambre.id} value={chambre.id}>
                            {chambre.name} - {chambre.region}
                          </option>
                        ))}
                      </select>
                      {chambreId && (
                        <div className="mt-2 text-xs text-gray-500">
                          {chambresMetier.find(c => c.id === chambreId)?.phone && (
                            <p>Tél: {chambresMetier.find(c => c.id === chambreId)?.phone}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Si incubateur, SAE ou autre */}
                  {(affiliationType === 'incubateur' || affiliationType === 'sae' || affiliationType === 'autre') && (
                    <>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                          Nom de la structure
                        </label>
                        <input
                          value={affiliationName}
                          onChange={(e) => setAffiliationName(e.target.value)}
                          className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-base font-medium focus:border-brand-500 focus:outline-none transition-all bg-white"
                          placeholder={`Nom de votre ${affiliationType === 'incubateur' ? 'incubateur' : affiliationType === 'sae' ? 'SAE' : 'structure'}`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                          Numéro d'affiliation / Certificat (optionnel)
                        </label>
                        <input
                          value={affiliationNumber}
                          onChange={(e) => setAffiliationNumber(e.target.value)}
                          className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-base font-medium focus:border-brand-500 focus:outline-none transition-all bg-white"
                          placeholder="Numéro d'affiliation si vous en avez un"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 5: Profession (Artisan only) */}
          {currentStep === 5 && role === 'artisan' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Searchable Category Selector */}
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  Votre Métier
                </label>
                <SearchableCategorySelect
                  categories={categories}
                  value={categoryId}
                  onChange={setCategoryId}
              />
            </div>

                <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  Spécialité (optionnel)
                </label>
                  <input
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-lg font-medium focus:border-brand-500 focus:outline-none transition-all bg-white"
                  placeholder="Ex: Réparation de fuites"
                  />
                </div>

                <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  À propos de vous (optionnel)
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-base font-medium focus:border-brand-500 focus:outline-none transition-all bg-white min-h-28 resize-none"
                  placeholder="Décrivez votre expérience et savoir-faire..."
                  />
                </div>
            </div>
          )}

          {/* Step 6: Portfolio (Artisan only) */}
          {currentStep === 6 && role === 'artisan' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-4">
                <div className="w-20 h-20 bg-brand-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Image size={36} className="text-brand-500" />
                </div>
                <p className="text-gray-500 text-sm">
                  Ajoutez des photos de vos réalisations pour inspirer confiance
                </p>
              </div>

              {/* Upload Zone */}
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePortfolioUpload}
                  disabled={uploadingImage}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  uploadingImage ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/50'
                }`}>
                  {uploadingImage ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={32} className="animate-spin text-brand-500" />
                      <p className="text-sm font-bold text-brand-600">Upload en cours...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center">
                        <Upload size={28} className="text-brand-500" />
                      </div>
                      <p className="font-bold text-gray-700">Ajouter des photos</p>
                      <p className="text-xs text-gray-400">JPG, PNG (max 5 photos)</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Portfolio Preview */}
              {portfolioImages.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {portfolioImages.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                      <img 
                        src={url} 
                        alt={`Portfolio ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePortfolioImage(index)}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <p className="text-center text-xs text-gray-400">
                Vous pourrez ajouter d'autres photos plus tard
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
            {error && (
          <div className="rounded-2xl border-2 border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 font-medium mb-4 animate-in fade-in">
                {error}
              </div>
            )}

        {/* Action Button */}
        {currentStep > 1 && (
          <div className="mt-auto pt-6">
            {currentStep === totalSteps ? (
              <button
                onClick={handleSubmit}
                disabled={loading || !isStepValid()}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-brand-500 text-white font-black py-4 shadow-xl shadow-brand-200 hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-60 text-lg"
              >
                {loading ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <>
                    <Sparkles size={24} />
                    Terminer
                  </>
                )}
              </button>
            ) : (
            <button
                onClick={nextStep}
                disabled={!isStepValid()}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gray-900 text-white font-black py-4 shadow-xl hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-40 text-lg"
              >
                Suivant
                <ArrowRight size={24} />
            </button>
            )}
        </div>
        )}
      </main>
    </div>
  );
}
