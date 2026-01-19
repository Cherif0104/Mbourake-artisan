import React, { useEffect, useState, useCallback, useRef, useMemo, startTransition } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Mail, ArrowRight, Lock, Eye, EyeOff, 
  Briefcase, User as UserIcon, Check, MapPin, Phone, 
  Upload, X, Loader2, ArrowLeft, Sparkles, CheckCircle,
  Search, ChevronDown
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile, type ProfileRole } from '../hooks/useProfile';
import { useDiscovery } from '../hooks/useDiscovery';
import { supabase } from '../lib/supabase';
import { LanguageSelector } from '../components/LanguageSelector';

// Google Logo
const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

type AuthMode = 'signup' | 'login';
type OnboardStep = 'role' | 'auth' | 'profile';

const CLIENT_STEPS = 3;
const ARTISAN_STEPS = 5;

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
      
      {isOpen && (
        <>
          <div className="absolute z-50 w-full mt-2 bg-white rounded-2xl border-2 border-gray-100 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tapez pour rechercher..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-base focus:outline-none focus:bg-gray-100 transition-colors text-gray-900"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="max-h-64 overflow-auto">
              {filteredCategories.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-400">
                  <Search size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="font-medium">Aucun métier trouvé</p>
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
          </div>
          
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setIsOpen(false);
              setSearchQuery('');
            }}
          />
        </>
      )}
    </div>
  );
}

export function OnboardPage() {
  const auth = useAuth();
  const { profile, loading: profileLoading, upsertProfile } = useProfile();
  const { categories } = useDiscovery();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Mode depuis URL (signup ou login)
  const urlMode = searchParams.get('mode');
  const authMode: AuthMode = (urlMode === 'login' || urlMode === 'signup') ? urlMode : 'signup';
  
  // Step depuis URL (pour le profil si déjà commencé)
  const urlStep = searchParams.get('step');
  
  // Current step state - initialisation stable
  const [currentStep, setCurrentStep] = useState<OnboardStep>(() => {
    if (urlStep === 'profile') return 'profile';
    return authMode === 'signup' ? 'role' : 'auth';
  });
  const [profileStep, setProfileStep] = useState(1);
  
  // Authentication
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isOAuthInProgress, setIsOAuthInProgress] = useState(false);
  
  // Profile setup (pour signup)
  const [role, setRole] = useState<ProfileRole | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCommune, setSelectedCommune] = useState('');
  const [location, setLocation] = useState(''); // Format: "Région, Département, Commune"
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [bio, setBio] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [portfolioImages, setPortfolioImages] = useState<string[]>([]);
  
  // Loading & errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRedirectedToDashboard, setHasRedirectedToDashboard] = useState(false);
  const isTransitioningRef = useRef(false); // Guard pour éviter les transitions concurrentes
  
  // Structure hiérarchique : Régions > Départements > Communes
  const senegalLocationData: Record<string, Record<string, string[]>> = {
    'Dakar': {
      'Dakar': ['Dakar Plateau', 'Médina', 'Fann', 'Point E', 'Mermoz', 'Ouakam', 'Ngor', 'Yoff', 'Grand Dakar', 'Parcelles Assainies', 'Liberté', 'Gueule Tapée', 'Colobane', 'HLM'],
      'Pikine': ['Pikine', 'Guédiawaye', 'Thiaroye', 'Yeumbeul', 'Keur Massar'],
      'Rufisque': ['Rufisque', 'Bargny', 'Sébikotane', 'Diamniadio']
    },
    'Thiès': {
      'Thiès': ['Thiès', 'Khombole', 'Notto', 'Tivaouane'],
      'Mbour': ['Mbour', 'Nianing', 'Saly', 'Somone', 'Warang'],
      'Tivaouane': ['Tivaouane', 'Méouane', 'Pire', 'Ngandiouf']
    },
    'Saint-Louis': {
      'Saint-Louis': ['Saint-Louis', 'Goxu Mbacc', 'Guet Ndar', 'Sor'],
      'Dagana': ['Dagana', 'Richard Toll', 'Rosso'],
      'Podor': ['Podor', 'Mboumba', 'Cas-Cas']
    },
    'Diourbel': {
      'Diourbel': ['Diourbel', 'Bambey', 'Ndindy'],
      'Bambey': ['Bambey', 'Linguère', 'Baba Garage'],
      'Mbacké': ['Mbacké', 'Touba', 'Dahra']
    },
    'Kaolack': {
      'Kaolack': ['Kaolack', 'Kaffrine', 'Koungheul'],
      'Nioro du Rip': ['Nioro du Rip', 'Paoskoto', 'Porokhane'],
      'Guinguinéo': ['Guinguinéo', 'Kébémer', 'Nguékhokh']
    },
    'Ziguinchor': {
      'Ziguinchor': ['Ziguinchor', 'Cap Skirring', 'Kafountine'],
      'Oussouye': ['Oussouye', 'Cabrousse', 'Mlomp'],
      'Bignona': ['Bignona', 'Tendouck', 'Thionck Essyl']
    },
    'Louga': {
      'Louga': ['Louga', 'Kébémer', 'Nguékhokh'],
      'Kébémer': ['Kébémer', 'Daga', 'Sagata'],
      'Linguère': ['Linguère', 'Barkédji', 'Sagata']
    },
    'Fatick': {
      'Fatick': ['Fatick', 'Diakhao', 'Tattaguine'],
      'Foundiougne': ['Foundiougne', 'Passy', 'Niakhar'],
      'Gossas': ['Gossas', 'Diouroup', 'Tattaguine']
    },
    'Kolda': {
      'Kolda': ['Kolda', 'Dabo', 'Saré Bidji'],
      'Vélingara': ['Vélingara', 'Pakour', 'Kounkané'],
      'Médina Yoro Foulah': ['Médina Yoro Foulah', 'Dabo', 'Kounkané']
    },
    'Matam': {
      'Matam': ['Matam', 'Agnam Civol', 'Orkadiéré'],
      'Kanel': ['Kanel', 'Thilogne', 'Orkadiéré'],
      'Ranérou Ferlo': ['Ranérou Ferlo', 'Ourossogui', 'Agnam Civol']
    },
    'Kaffrine': {
      'Kaffrine': ['Kaffrine', 'Nganda', 'Koungheul'],
      'Birkilane': ['Birkilane', 'Malem Hodar', 'Passy'],
      'Malem Hodar': ['Malem Hodar', 'Nganda', 'Koungheul']
    },
    'Kédougou': {
      'Kédougou': ['Kédougou', 'Bandafassi', 'Salémata'],
      'Salémata': ['Salémata', 'Dindéfélo', 'Bandafassi'],
      'Saraya': ['Saraya', 'Fongolimbi', 'Bembou']
    },
    'Sédhiou': {
      'Sédhiou': ['Sédhiou', 'Goudomp', 'Djibanar'],
      'Goudomp': ['Goudomp', 'Tanaff', 'Diattacounda'],
      'Bounkiling': ['Bounkiling', 'Néma Bah', 'Sindian']
    },
    'Tambacounda': {
      'Tambacounda': ['Tambacounda', 'Bakel', 'Kidira'],
      'Bakel': ['Bakel', 'Goudiry', 'Koumpentoum'],
      'Koumpentoum': ['Koumpentoum', 'Niani', 'Koumpentoum']
    }
  };
  
  const senegalRegions = Object.keys(senegalLocationData);
  
  // Obtenir les départements pour une région
  const getDepartmentsForRegion = (region: string): string[] => {
    if (!region || !senegalLocationData[region]) return [];
    return Object.keys(senegalLocationData[region]);
  };
  
  // Obtenir les communes pour un département d'une région
  const getCommunesForDepartment = (region: string, department: string): string[] => {
    if (!region || !department || !senegalLocationData[region] || !senegalLocationData[region][department]) return [];
    return senegalLocationData[region][department];
  };
  
  // Mettre à jour location quand région/département/commune changent
  useEffect(() => {
    const parts: string[] = [];
    if (selectedRegion) parts.push(selectedRegion);
    if (selectedDepartment) parts.push(selectedDepartment);
    if (selectedCommune) parts.push(selectedCommune);
    setLocation(parts.join(', '));
  }, [selectedRegion, selectedDepartment, selectedCommune]);
  
  // Déterminer le rôle si login et profil existe déjà
  useEffect(() => {
    if (authMode === 'login' && profile?.role) {
      setRole(profile.role);
    }
  }, [authMode, profile]);
  
  // Récupérer le rôle depuis l'URL au montage
  useEffect(() => {
    const roleFromUrl = searchParams.get('role') as ProfileRole | null;
    if (roleFromUrl && ['client', 'artisan'].includes(roleFromUrl)) {
      setRole(roleFromUrl);
    }
  }, [searchParams]);
  
  const totalSteps = role === 'artisan' ? ARTISAN_STEPS : CLIENT_STEPS;
  
  // Titre du profil stabilisé avec useMemo pour éviter les re-renders
  const profileTitle = useMemo(() => {
    if (profileStep === 1) return "Enchanté ! 👋";
    if (profileStep === 2) return "Votre identité";
    if (profileStep === 3) return "Votre localisation";
    if (profileStep === 4 && role === 'artisan') return "Votre expertise";
    if (profileStep === 5 && role === 'artisan') return "Votre portfolio";
    return "Complétez votre profil";
  }, [profileStep, role]);
  
  // Fonction pour vérifier si le profil est complet
  const isProfileComplete = useCallback((profile: any): boolean => {
    if (!profile) return false;
    const requiredFields = ['role', 'full_name', 'location'];
    const hasRequiredFields = requiredFields.every(
      field => profile[field] && profile[field].toString().trim().length > 0
    );
    if (!hasRequiredFields) return false;
    if (profile.role === 'artisan' && !profile.category_id) return false;
    return true;
  }, []);
  
  // Gérer les redirections après authentification
  useEffect(() => {
    // Éviter les transitions concurrentes
    if (isTransitioningRef.current) return;
    
    // Ne rien faire pendant le chargement initial
    if (auth.loading) return;
    
    // Si OAuth est en cours, laisser le useEffect de détection OAuth gérer
    if (isOAuthInProgress) return;
    
    // Si le profil est en cours de chargement, attendre un peu (max 1.5 secondes)
    // pour éviter de bloquer l'utilisateur indéfiniment
    if (profileLoading) {
      const timer = setTimeout(() => {
        // Après 1.5 secondes, continuer même si le profil n'est pas chargé
        // pour éviter de bloquer l'utilisateur
      }, 1500);
      return () => clearTimeout(timer);
    }
    
    // Si pas connecté et qu'on était sur le flow de profil, revenir à auth/role selon mode
    if (!auth.user) {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      startTransition(() => {
        setCurrentStep((prevStep) => {
          // Si on est déjà sur le bon step pour un utilisateur non connecté, ne rien changer
          if (prevStep === 'profile') {
            return authMode === 'signup' ? 'role' : 'auth';
          }
          // Si on est déjà sur 'role' ou 'auth', garder le step actuel
          if (prevStep === 'role' || prevStep === 'auth') {
            return prevStep;
          }
          // Sinon, initialiser au bon step
          return authMode === 'signup' ? 'role' : 'auth';
        });
      });
      const timer = setTimeout(() => {
        isTransitioningRef.current = false;
      }, 200);
      return () => {
        clearTimeout(timer);
        isTransitioningRef.current = false;
      };
    }
    
    // Utilisateur connecté détecté
    // Si le profil est chargé et complet, rediriger vers dashboard
    if (profile && isProfileComplete(profile)) {
      // Profil complet → Dashboard (redirection une seule fois)
      if (!hasRedirectedToDashboard) {
        setHasRedirectedToDashboard(true);
        navigate('/dashboard', { replace: true });
      }
      return;
    }
    
    // Pour signup : si on n'a pas de rôle, afficher la page de sélection de rôle
    // C'est la page cible après OAuth
    if (authMode === 'signup' && !role && currentStep !== 'role') {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      startTransition(() => {
        setCurrentStep('role');
      });
      const timer = setTimeout(() => {
        isTransitioningRef.current = false;
      }, 200);
      return () => {
        clearTimeout(timer);
        isTransitioningRef.current = false;
      };
    }
    
    // Profil incomplet ou pas encore chargé → continuer vers profil
    // Si on a un rôle (depuis l'URL ou le state), aller directement au profil
    if (role && authMode === 'signup' && currentStep !== 'profile') {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      startTransition(() => {
        setCurrentStep('profile');
        setProfileStep(2); // Pour signup, on saute l'étape 1
      });
      const timer = setTimeout(() => {
        isTransitioningRef.current = false;
      }, 200);
      return () => {
        clearTimeout(timer);
        isTransitioningRef.current = false;
      };
    }
    
    // Pour login, aller au profil si on est sur auth
    if (authMode === 'login' && currentStep === 'auth') {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;
      startTransition(() => {
        setCurrentStep('profile');
        setProfileStep(1);
      });
      const timer = setTimeout(() => {
        isTransitioningRef.current = false;
      }, 200);
      return () => {
        clearTimeout(timer);
        isTransitioningRef.current = false;
      };
    }
  }, [
    auth.user?.id,
    auth.loading,
    profile?.id,
    profileLoading,
    isOAuthInProgress,
    authMode,
    role ?? '', // Toujours une string (vide si null)
    hasRedirectedToDashboard,
    currentStep,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    navigate,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    isProfileComplete,
  ]);
  
  // Auto-avancer à l'étape 2 du profil si on vient de sélectionner le rôle (signup)
  useEffect(() => {
    if (isTransitioningRef.current) return;
    if (currentStep === 'profile' && role && profileStep === 1 && authMode === 'signup') {
      isTransitioningRef.current = true;
      startTransition(() => {
        setProfileStep(2);
      });
      const timer = setTimeout(() => {
        isTransitioningRef.current = false;
      }, 100);
      return () => {
        clearTimeout(timer);
        isTransitioningRef.current = false;
      };
    }
  }, [currentStep, role, profileStep, authMode]);
  
  // Pré-remplir le nom depuis les métadonnées OAuth
  useEffect(() => {
    if (auth.user?.id && !fullName.trim()) {
      const fromProviderName =
        (auth.user.user_metadata?.full_name as string | undefined) ||
        (auth.user.user_metadata?.name as string | undefined) ||
        '';
      if (fromProviderName) {
        setFullName(fromProviderName);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user?.id]);
  
  // Détecter le retour OAuth et forcer l'affichage de la page de sélection de rôle
  useEffect(() => {
    // Éviter les transitions concurrentes
    if (isTransitioningRef.current) return;
    
    // Détecter le retour OAuth : utilisateur connecté + mode signup + pas de profil complet
    const isOAuthReturn = auth.user && 
                          authMode === 'signup' && 
                          !auth.loading && 
                          (!profile || !isProfileComplete(profile));
    
    if (isOAuthReturn) {
      // Si on n'a pas encore de rôle, afficher la page de sélection de rôle
      if (!role && currentStep !== 'role') {
        isTransitioningRef.current = true;
        startTransition(() => {
          setCurrentStep('role');
          setIsOAuthInProgress(false);
          setLoading(false);
        });
        const timer = setTimeout(() => {
          isTransitioningRef.current = false;
        }, 300);
        return () => {
          clearTimeout(timer);
          isTransitioningRef.current = false;
        };
      }
      // Si on a déjà un rôle, aller directement au profil
      if (role && currentStep !== 'profile') {
        isTransitioningRef.current = true;
        startTransition(() => {
          setCurrentStep('profile');
          setProfileStep(2); // Pour signup, on saute l'étape 1 (sélection du rôle)
          setIsOAuthInProgress(false);
          setLoading(false);
        });
        const timer = setTimeout(() => {
          isTransitioningRef.current = false;
        }, 300);
        return () => {
          clearTimeout(timer);
          isTransitioningRef.current = false;
        };
      }
      // Réinitialiser isOAuthInProgress si nécessaire
      if (isOAuthInProgress) {
        const timer = setTimeout(() => {
          setIsOAuthInProgress(false);
          setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [auth.user?.id, auth.loading, isOAuthInProgress, role, authMode, currentStep, profile, isProfileComplete]);
  
  // Réinitialiser isOAuthInProgress après OAuth réussi (fallback - sécurité)
  useEffect(() => {
    if (auth.user && isOAuthInProgress && !auth.loading) {
      // Délai pour s'assurer que le profil commence à charger
      const timer = setTimeout(() => {
        setIsOAuthInProgress(false);
        setLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [auth.user?.id, auth.loading, isOAuthInProgress]);
  
  // Si step est dans l'URL (pour reprendre le profil), l'utiliser
  useEffect(() => {
    if (urlStep === 'profile' && auth.user?.id && !isProfileComplete(profile || {})) {
      setCurrentStep('profile');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlStep, auth.user?.id, profile?.id, isProfileComplete]);
  
  // Handlers
  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    setIsOAuthInProgress(true);
    
    try {
      // Préserver le rôle dans l'URL de redirection OAuth
      await auth.signInWithGoogle(authMode, role || undefined);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de la connexion avec Google');
      setLoading(false);
      setIsOAuthInProgress(false);
    }
  };
  
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      if (authMode === 'signup') {
        if (password !== confirmPassword) {
          setError('Les mots de passe ne correspondent pas');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Le mot de passe doit contenir au moins 6 caractères');
          setLoading(false);
          return;
        }
        await auth.signUpWithPassword(email, password);
      } else {
        await auth.signInWithPassword(email, password);
      }
    } catch (e: any) {
      setError(e?.message ?? `Erreur lors de l'${authMode === 'signup' ? 'inscription' : 'authentification'}`);
      setLoading(false);
    }
  };
  
  const handleRoleSelect = (selectedRole: ProfileRole) => {
    setRole(selectedRole);
    setSearchParams(prev => {
      prev.set('role', selectedRole);
      return prev;
    });
    setCurrentStep('auth'); // Passer à l'authentification
  };
  
  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !auth.user) return;
    
    setLoading(true);
    
    try {
      const newImages: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const fileExt = file.name.split('.').pop();
        const fileName = `${auth.user.id}/portfolio/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        const { error } = await supabase.storage.from('photos').upload(fileName, file);
        if (error) continue;
        
        const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
        if (urlData?.publicUrl) {
          newImages.push(urlData.publicUrl);
        }
      }
      setPortfolioImages(prev => [...prev, ...newImages]);
    } catch (err) {
      setError('Erreur lors de l\'upload');
    }
    
    setLoading(false);
    e.target.value = '';
  };
  
  const isStepValid = (): boolean => {
    switch (profileStep) {
      case 1: return !!role;
      case 2: return fullName.trim().length > 0 && phone.trim().length > 0;
      case 3: return selectedRegion.length > 0 && selectedDepartment.length > 0 && selectedCommune.length > 0;
      case 4: return role === 'client' || categoryId !== undefined;
      case 5: return true; // Portfolio optionnel
      default: return false;
    }
  };
  
  const nextProfileStep = () => {
    if (profileStep < totalSteps) {
      startTransition(() => {
        setProfileStep(profileStep + 1);
      });
    }
  };
  
  const prevProfileStep = () => {
    if (profileStep > 1) {
      startTransition(() => {
        setProfileStep(profileStep - 1);
      });
    }
  };
  
  const handleProfileSubmit = async () => {
    if (!role) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await upsertProfile({
        role,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        location: location.trim() || null,
        category_id: role === 'artisan' ? categoryId : undefined,
        bio: role === 'artisan' ? bio.trim() : undefined,
        specialty: role === 'artisan' ? specialty.trim() : undefined,
        portfolio_urls: role === 'artisan' ? portfolioImages : undefined,
      });
      
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de la création du profil');
      setLoading(false);
    }
  };
  
  // Fonction intelligente pour gérer le retour depuis le header
  const handleBack = () => {
    if (currentStep === 'profile' && profileStep > 1) {
      // Si on est dans le profil et pas à l'étape 1, revenir à l'étape précédente
      prevProfileStep();
    } else if (currentStep === 'profile' && profileStep === 1) {
      // Si on est à l'étape 1 du profil, revenir à la sélection de rôle ou auth
      startTransition(() => {
        setCurrentStep(authMode === 'signup' ? 'role' : 'auth');
      });
    } else if (currentStep === 'auth' && authMode === 'signup' && role) {
      // Si on est sur auth en mode signup avec un rôle, revenir à role
      startTransition(() => {
        setCurrentStep('role');
      });
    } else {
      // Sinon, retourner à la landing page
      navigate('/');
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFCFB] via-white to-orange-50/30 flex flex-col">
      {/* Header avec sélecteur de langue */}
      <header className="px-6 py-4 bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button 
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-500 hover:text-brand-600 font-bold text-sm transition-colors"
          >
            <ArrowLeft size={18} />
            Retour
          </button>
          <LanguageSelector />
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          {/* Step 1: Role Selection (Signup only) */}
          {currentStep === 'role' && authMode === 'signup' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-gray-900 mb-2">Vous êtes...</h1>
                <p className="text-gray-500">Choisissez votre profil</p>
              </div>
              
              <div className="space-y-4">
                <button
                  onClick={() => handleRoleSelect('client')}
                  className="w-full rounded-3xl border-2 border-gray-100 p-6 text-left transition-all hover:scale-[1.02] active:scale-[0.98] hover:border-brand-200 hover:shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-brand-500 text-white">
                      <UserIcon size={32} />
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-lg text-gray-900">Je suis Client</div>
                      <div className="text-sm text-gray-500">Je cherche un artisan pour mon projet</div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleRoleSelect('artisan')}
                  className="w-full rounded-3xl border-2 border-gray-100 p-6 text-left transition-all hover:scale-[1.02] active:scale-[0.98] hover:border-brand-200 hover:shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-brand-500 text-white">
                      <Briefcase size={32} />
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-lg text-gray-900">Je suis Artisan</div>
                      <div className="text-sm text-gray-500">Je propose mes services et mon savoir-faire</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
          
          {/* Step 2: Authentication */}
          {currentStep === 'auth' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              {authMode === 'signup' && role && (
                <button
                  onClick={() => setCurrentStep('role')}
                  className="flex items-center gap-2 text-gray-500 hover:text-brand-600 font-bold text-sm mb-6 transition-colors"
                >
                  <ArrowLeft size={18} />
                  Retour
                </button>
              )}
              
              <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-gray-900 mb-2">
                  {authMode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
                </h1>
                <p className="text-gray-500">
                  {authMode === 'signup' 
                    ? 'Choisissez votre méthode d\'authentification' 
                    : 'Connectez-vous à votre compte'}
                </p>
              </div>
              
              <div className="space-y-6">
                {/* Google Button */}
                <button
                  onClick={handleGoogleAuth}
                  disabled={loading || isOAuthInProgress}
                  type="button"
                  className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 rounded-2xl py-4 font-bold text-gray-700 hover:border-gray-200 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <GoogleLogo />
                  {loading || isOAuthInProgress 
                    ? "Redirection vers Google..." 
                    : authMode === 'signup'
                      ? "S'inscrire avec Google" 
                      : "Se connecter avec Google"}
                </button>
                
                {/* Divider */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-bold text-gray-400 uppercase">OU</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                
                {/* Email Form */}
                <form onSubmit={handleEmailAuth} className="space-y-4">
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Votre adresse email"
                      required
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-brand-500 focus:bg-white focus:outline-none transition-all font-medium text-gray-900"
                    />
                  </div>
                  
                  <div className="relative">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Votre mot de passe"
                      required
                      className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-brand-500 focus:bg-white focus:outline-none transition-all font-medium text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  
                  {authMode === 'signup' && (
                    <div className="relative">
                      <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirmez le mot de passe"
                        required
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-brand-500 focus:bg-white focus:outline-none transition-all font-medium text-gray-900"
                      />
                    </div>
                  )}
                  
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 font-medium">
                      {error}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-500 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        {authMode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
          
          {/* Step 3: Profile Setup */}
          {currentStep === 'profile' && auth.user && role && (
            <div key={`profile-container-${profileStep}`} className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-6">
                {profileStep > 1 ? (
                  <button
                    onClick={prevProfileStep}
                    className="flex items-center gap-2 text-gray-500 hover:text-brand-600 font-bold text-sm transition-colors"
                  >
                    <ArrowLeft size={18} />
                    Retour
                  </button>
                ) : (
                  <div />
                )}
                
                <div className="flex items-center gap-2">
                  {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                    <div
                      key={step}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        step === profileStep
                          ? 'w-8 bg-brand-500'
                          : step < profileStep
                          ? 'bg-brand-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                
                <div className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  {profileStep}/{totalSteps}
                </div>
              </div>
              
              <div className="mb-8 text-center">
                <h1 className="text-2xl font-black text-gray-900 mb-2">
                  {profileTitle}
                </h1>
              </div>
              
              {/* Step Content */}
              <div className="space-y-6">
                {/* Step 1: Rôle (seulement si login et pas de rôle) */}
                {profileStep === 1 && authMode === 'login' && !profile?.role && (
                  <div className="space-y-4">
                    <button
                      onClick={() => {
                        setRole('client');
                        setProfileStep(2);
                      }}
                      className="w-full rounded-3xl border-2 border-gray-100 p-6 text-left transition-all hover:scale-[1.02] active:scale-[0.98] hover:border-brand-200 hover:shadow-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-brand-500 text-white">
                          <UserIcon size={32} />
                        </div>
                        <div className="flex-1">
                          <div className="font-black text-lg text-gray-900">Je suis Client</div>
                          <div className="text-sm text-gray-500">Je cherche un artisan pour mon projet</div>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => {
                        setRole('artisan');
                        setProfileStep(2);
                      }}
                      className="w-full rounded-3xl border-2 border-gray-100 p-6 text-left transition-all hover:scale-[1.02] active:scale-[0.98] hover:border-brand-200 hover:shadow-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-brand-500 text-white">
                          <Briefcase size={32} />
                        </div>
                        <div className="flex-1">
                          <div className="font-black text-lg text-gray-900">Je suis Artisan</div>
                          <div className="text-sm text-gray-500">Je propose mes services et mon savoir-faire</div>
                        </div>
                      </div>
                    </button>
                  </div>
                )}
                
                {/* Step 2: Identity */}
                {profileStep === 2 && (
                  <>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                        Nom complet
                      </label>
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-lg font-medium focus:border-brand-500 focus:outline-none transition-all bg-white text-gray-900"
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
                        className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-lg font-medium focus:border-brand-500 focus:outline-none transition-all bg-white text-gray-900"
                        placeholder="77 123 45 67"
                        type="tel"
                      />
                    </div>
                  </>
                )}
                
                {/* Step 3: Location */}
                {profileStep === 3 && (
                  <div key="profile-step-3" className="space-y-6">
                    {/* Région */}
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                        <MapPin size={12} className="inline mr-1" />
                        Région
                      </label>
                      <select
                        value={selectedRegion}
                        onChange={(e) => {
                          setSelectedRegion(e.target.value);
                          setSelectedDepartment(''); // Réinitialiser le département
                          setSelectedCommune(''); // Réinitialiser la commune
                        }}
                        className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-lg font-medium focus:border-brand-500 focus:outline-none transition-all bg-white text-gray-900"
                        required
                      >
                        <option value="">Sélectionnez une région...</option>
                        {senegalRegions.map((region) => (
                          <option key={region} value={region}>{region}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Département */}
                    {selectedRegion && (
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                          Département
                        </label>
                        <select
                          value={selectedDepartment}
                          onChange={(e) => {
                            setSelectedDepartment(e.target.value);
                            setSelectedCommune(''); // Réinitialiser la commune
                          }}
                          className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-lg font-medium focus:border-brand-500 focus:outline-none transition-all bg-white text-gray-900"
                          required
                        >
                          <option value="">Sélectionnez un département...</option>
                          {getDepartmentsForRegion(selectedRegion).map((dept) => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    {/* Commune */}
                    {selectedRegion && selectedDepartment && (
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                          Commune
                        </label>
                        <select
                          value={selectedCommune}
                          onChange={(e) => setSelectedCommune(e.target.value)}
                          className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-lg font-medium focus:border-brand-500 focus:outline-none transition-all bg-white text-gray-900"
                          required
                        >
                          <option value="">Sélectionnez une commune...</option>
                          {getCommunesForDepartment(selectedRegion, selectedDepartment).map((commune) => (
                            <option key={commune} value={commune}>{commune}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Step 4: Category (Artisan only) */}
                {profileStep === 4 && role === 'artisan' && (
                  <>
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
                        className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-lg font-medium focus:border-brand-500 focus:outline-none transition-all bg-white text-gray-900"
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
                        className="w-full rounded-2xl border-2 border-gray-100 px-5 py-4 text-base font-medium focus:border-brand-500 focus:outline-none transition-all bg-white min-h-28 resize-none text-gray-900"
                        placeholder="Décrivez votre expérience..."
                      />
                    </div>
                  </>
                )}
                
                {/* Step 5: Portfolio (Artisan only) */}
                {profileStep === 5 && role === 'artisan' && (
                  <div>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePortfolioUpload}
                        disabled={loading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="border-2 border-dashed rounded-2xl p-8 text-center transition-all border-gray-200 hover:border-brand-300 hover:bg-brand-50/50">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center">
                            <Upload size={28} className="text-brand-500" />
                          </div>
                          <p className="font-bold text-gray-700">Ajouter des photos</p>
                          <p className="text-xs text-gray-400">JPG, PNG (optionnel)</p>
                        </div>
                      </div>
                    </div>
                    
                    {portfolioImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-3 mt-4">
                        {portfolioImages.map((url, index) => (
                          <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                            <img src={url} alt={`Portfolio ${index + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setPortfolioImages(prev => prev.filter((_, i) => i !== index))}
                              className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 font-medium">
                    {error}
                  </div>
                )}
                
                {/* Action Buttons */}
                {profileStep === totalSteps ? (
                  <button
                    onClick={handleProfileSubmit}
                    disabled={loading || !isStepValid()}
                    className="w-full flex items-center justify-center gap-3 rounded-2xl bg-brand-500 text-white font-black py-4 shadow-xl hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-60 text-lg"
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
                    onClick={nextProfileStep}
                    disabled={!isStepValid()}
                    className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gray-900 text-white font-black py-4 hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-40 text-lg"
                  >
                    Suivant
                    <ArrowRight size={24} />
                  </button>
                )}
              </div>
            </div>
          )}
          
          {/* Fallback par défaut si aucune condition n'est vraie (sécurité) */}
          {currentStep !== 'role' && currentStep !== 'auth' && currentStep !== 'profile' && (
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Chargement...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
