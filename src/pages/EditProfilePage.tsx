import React, { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, User, Check, Image, Video, X, Upload, Play, MapPin, Briefcase, ChevronRight, ChevronLeft, Search, Building2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useDiscovery } from '../hooks/useDiscovery';
import { useToastContext } from '../contexts/ToastContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { supabase } from '../lib/supabase';

const MAX_PHOTOS = 10;
const MAX_VIDEOS = 5;
const MAX_PHOTO_SIZE_MB = 5;
const MAX_VIDEO_SIZE_MB = 50;

// Structure hiérarchique : Régions > Départements > Communes
const senegalLocationData: Record<string, Record<string, string[]>> = {
  Dakar: {
    Dakar: [
      'Plateau',
      'Médina',
      'Fass-Colobane-Gueule Tapée',
      'Yoff',
      'Ngor',
      'Ouakam',
      'Grand Dakar',
      'Parcelles Assainies',
    ],
    Pikine: [
      'Guinaw Rails Nord',
      'Guinaw Rails Sud',
      'Thiaroye',
      'Keur Massar',
      'Dalifort',
    ],
    Rufisque: [
      'Rufisque Est',
      'Rufisque Ouest',
      'Bargny',
      'Sébikhotane',
    ],
    Guédiawaye: ['Golf Sud', 'Sam Notaire', 'Ndiarème Limamoulaye'],
    'Keur Massar': ['Keur Massar Nord', 'Keur Massar Sud'],
  },
  'Thiès': {
    'Thiès Nord': ['Thiès Ville', 'Grand Standing'],
    'Thiès Sud': ['Mbour 1', 'Mbour 2'],
    Mbour: ['Mbour Ville', 'Saly', 'Ngaparou', 'Somone'],
  },
  Diourbel: {
    Diourbel: ['Diourbel Ville'],
    Mbacké: ['Mbacké Ville', 'Touba'],
  },
  Fatick: {
    Fatick: ['Fatick Ville'],
    Foundiougne: ['Foundiougne Ville'],
  },
  Kaolack: {
    Kaolack: ['Kaolack Ville'],
    Nioro: ['Nioro Ville'],
  },
  Kaffrine: {
    Kaffrine: ['Kaffrine Ville'],
  },
  Kolda: {
    Kolda: ['Kolda Ville'],
  },
  Ziguinchor: {
    Ziguinchor: ['Ziguinchor Ville'],
  },
  Sédhiou: {
    Sédhiou: ['Sédhiou Ville'],
  },
  'Saint-Louis': {
    'Saint-Louis': ['Saint-Louis Ville'],
    Podor: ['Podor Ville'],
    Dagana: ['Dagana Ville'],
  },
  Louga: {
    Louga: ['Louga Ville'],
  },
  Matam: {
    Matam: ['Matam Ville'],
  },
  Tambacounda: {
    Tambacounda: ['Tambacounda Ville'],
  },
  'Kédougou': {
    'Kédougou': ['Kédougou Ville'],
  },
};

const senegalRegions = Object.keys(senegalLocationData);

const getDepartmentsForRegion = (region: string): string[] => {
  if (!region || !senegalLocationData[region]) return [];
  return Object.keys(senegalLocationData[region]);
};

const getCommunesForDepartment = (region: string, department: string): string[] => {
  if (!region || !department) return [];
  return senegalLocationData[region]?.[department] ?? [];
};

export function EditProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const auth = useAuth();
  const { user } = auth;
  const { profile, loading: profileLoading, upsertProfile } = useProfile();
  const { categories } = useDiscovery();
  const { error: showError } = useToastContext();
  
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [success, setSuccess] = useState(false);
  const [initializingProfile, setInitializingProfile] = useState(false);
  
  // Système d'étapes pour le wizard
  const [currentStep, setCurrentStep] = useState(1);
  const [isMounted, setIsMounted] = useState(false);
  
  // S'assurer que le composant est monté avant de rendre les animations
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);
  
  // Rôle depuis l'URL (pour onboarding)
  const roleFromUrl = searchParams.get('role') as 'client' | 'artisan' | null;
  const isOnboarding = searchParams.get('mode') === 'onboarding';
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [department, setDepartment] = useState('');
  const [commune, setCommune] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Artisan-specific fields
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  
  // Recherche de métier
  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // Déterminer si on est artisan : soit depuis le profil, soit depuis l'URL (onboarding)
  // PRIORITÉ ABSOLUE à l'URL en mode onboarding pour afficher les bons champs même si le profil n'a pas encore le bon rôle
  // Si roleFromUrl === 'artisan', on force l'affichage des champs artisan même si le profil dit "client"
  // Vérification aussi dans localStorage au cas où les paramètres URL sont perdus
  const roleFromStorage = typeof window !== 'undefined' ? localStorage.getItem('mbourake_pending_role') : null;
  
  // CORRECTION CRITIQUE : Ne JAMAIS présumer qu'on est artisan par défaut
  // On est artisan UNIQUEMENT si :
  // 1. roleFromUrl === 'artisan' (paramètre URL - priorité absolue)
  // 2. roleFromStorage === 'artisan' (localStorage - fallback si URL perdue)
  // 3. profile?.role === 'artisan' (profil existant en base)
  // ❌ SUPPRIMÉ : (isOnboarding && !profile) - Cette condition forçait les clients à être traités comme artisans
  const isArtisan = 
    roleFromUrl === 'artisan' || 
    roleFromStorage === 'artisan' || 
    profile?.role === 'artisan';
  
  // Définir les étapes selon le type d'utilisateur
  const getSteps = () => {
    if (isArtisan) {
      return [
        { id: 1, title: 'Informations personnelles', icon: User },
        { id: 2, title: 'Localisation', icon: MapPin },
        { id: 3, title: 'Informations professionnelles', icon: Briefcase },
        { id: 4, title: 'Portfolio', icon: Image },
        { id: 5, title: 'Affiliation', icon: Building2 },
      ];
    } else {
      return [
        { id: 1, title: 'Informations personnelles', icon: User },
        { id: 2, title: 'Localisation', icon: MapPin },
      ];
    }
  };
  
  const steps = getSteps();
  const totalSteps = steps.length;

  // Initialiser ou CORRIGER le profil si on arrive en mode onboarding avec un rôle
  // - Si aucun profil n'existe: on crée une ligne minimale avec le bon rôle.
  // - Si un profil existe mais avec un rôle différent (ex: client au lieu d'artisan):
  //   on met à jour le rôle pour afficher les bons champs.
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    // Vérifier que l'authentification est complète avant de continuer
    // IMPORTANT : Vérifier auth.loading EN PREMIER et aussi s'assurer que auth.user est vraiment disponible
    if (auth.loading || initializingProfile || profileLoading) return;
    if (!auth.user || !user || hasInitializedRef.current) return;
    if (!auth.session) return; // Vérifier aussi que la session existe
    if (!isOnboarding) return; // Pas en mode onboarding
    
    // Déterminer le rôle à utiliser : priorité à l'URL, puis localStorage
    // IMPORTANT : Ne PAS utiliser isArtisan ici car il peut être basé sur un profil existant incorrect
    const targetRole = roleFromUrl || roleFromStorage;
    if (!targetRole) {
      console.warn('[EditProfilePage] En mode onboarding mais aucun rôle déterminé (URL ou localStorage vide)');
      return; // Pas de rôle déterminé - ne pas initialiser
    }

    // Si le profil existe déjà avec le bon rôle, ne rien faire
    if (profile && profile.role === targetRole) {
      hasInitializedRef.current = true;
      return;
    }

    const defaultName =
      profile?.full_name ||
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      user.email ||
      'Utilisateur';

    // Capture de auth.user dans une variable locale pour éviter les problèmes de timing
    const currentUser = auth.user;
    if (!currentUser) {
      console.error('[EditProfilePage] auth.user est null, impossible de créer le profil');
      hasInitializedRef.current = false;
      setInitializingProfile(false);
      return;
    }

    setInitializingProfile(true);
    hasInitializedRef.current = true;
    
    // Utiliser une fonction asynchrone pour capturer auth.user de manière stable
    const initializeProfileAsync = async () => {
      // Attendre un peu pour s'assurer que auth.user est bien synchronisé
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Vérifier une dernière fois que l'utilisateur est toujours authentifié
      if (!auth.user) {
        console.error('[EditProfilePage] auth.user est devenu null pendant l\'initialisation');
        hasInitializedRef.current = false;
        setInitializingProfile(false);
        return;
      }

      try {
        await upsertProfile({
      full_name: defaultName,
      role: targetRole as 'client' | 'artisan', // IMPORTANT : forcer le bon rôle même si le profil existe déjà
          phone: profile?.phone ?? null,
          location: profile?.location ?? null,
          company_name: profile?.company_name ?? null,
          region: profile?.region ?? null,
          department: profile?.department ?? null,
          commune: profile?.commune ?? null,
        });
      } catch (e) {
        console.error('Erreur lors de l\'initialisation/correction du profil dans EditProfilePage:', e);
        hasInitializedRef.current = false; // Réessayer en cas d'erreur
      } finally {
        setInitializingProfile(false);
      }
    };

    initializeProfileAsync();
  }, [auth.loading, auth.user, user?.id, profile?.id, profile?.role, profileLoading, isOnboarding, roleFromUrl, roleFromStorage, isArtisan, initializingProfile, upsertProfile, profile]);

  // Ref pour éviter de charger les données plusieurs fois
  const profileDataLoadedRef = useRef<string | null>(null);
  
  // Déclarer loadArtisanData AVANT le useEffect qui l'utilise (correction du bug "Cannot access before initialization")
  const loadArtisanData = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('artisans')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setCategoryId(data.category_id);
      // Mettre à jour aussi categorySearch avec le nom de la catégorie
      if (data.category_id) {
        const selectedCategory = categories.find(c => c.id === data.category_id);
        if (selectedCategory) {
          setCategorySearch(selectedCategory.name);
        }
      }
      setSpecialty(data.specialty || '');
      setBio(data.bio || '');
      setPortfolioUrls(data.portfolio_urls || []);
      setVideoUrls(data.video_urls || []);
    }
  }, [user, categories]);
  
  // Load existing profile data
  useEffect(() => {
    if (!profile) return;
    
    // Éviter de recharger si le profil n'a pas changé
    if (profileDataLoadedRef.current === profile.id && profileDataLoadedRef.current) {
      return;
    }
    
    profileDataLoadedRef.current = profile.id;
    
    setFullName(profile.full_name || '');
    setCompanyName(profile.company_name || '');
    setPhone(profile.phone || '');
    // Si de nouvelles colonnes sont remplies, on les utilise, sinon on retombe sur l'ancienne location
    const initialRegion = profile.region || '';
    setRegion(initialRegion);
    setDepartment(profile.department || '');
    setCommune(profile.commune || '');
    setAvatarUrl(profile.avatar_url);
    
    // Load artisan data if applicable
    if (profile.role === 'artisan') {
      loadArtisanData();
    }
  }, [profile?.id, profile?.full_name, profile?.company_name, profile?.phone, profile?.region, profile?.department, profile?.commune, profile?.avatar_url, profile?.role, loadArtisanData]);

  // Upload portfolio photo
  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    
    if (portfolioUrls.length + files.length > MAX_PHOTOS) {
      showError(`Maximum ${MAX_PHOTOS} photos autorisées`);
      return;
    }
    
    setUploadingPortfolio(true);
    
    try {
      const newUrls: string[] = [];
      
      for (const file of Array.from(files)) {
        // Check file size
        if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
          showError(`Photo trop volumineuse (max ${MAX_PHOTO_SIZE_MB}MB)`);
          continue;
        }
        
        if (!file.type.startsWith('image/')) continue;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/portfolio/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        const { error } = await supabase.storage
          .from('photos')
          .upload(fileName, file);
        
        if (error) continue;
        
        const { data: urlData } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);
        
        if (urlData?.publicUrl) {
          newUrls.push(urlData.publicUrl);
        }
      }
      
      if (newUrls.length > 0) {
        const updatedUrls = [...portfolioUrls, ...newUrls];
        setPortfolioUrls(updatedUrls);
        
        // Save to database immediately
        await supabase
          .from('artisans')
          .update({ portfolio_urls: updatedUrls })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error('Portfolio upload error:', err);
    }
    
    setUploadingPortfolio(false);
    e.target.value = '';
  };

  // Remove portfolio photo
  const removePortfolioPhoto = async (index: number) => {
    if (!user) return;
    
    const updatedUrls = portfolioUrls.filter((_, i) => i !== index);
    setPortfolioUrls(updatedUrls);
    
    await supabase
      .from('artisans')
      .update({ portfolio_urls: updatedUrls })
      .eq('id', user.id);
  };

  // Upload video
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;
    
    if (videoUrls.length + files.length > MAX_VIDEOS) {
      showError(`Maximum ${MAX_VIDEOS} vidéos autorisées`);
      return;
    }
    
    setUploadingVideo(true);
    
    try {
      const newUrls: string[] = [];
      
      for (const file of Array.from(files)) {
        // Check file size
        if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
          showError(`Vidéo trop volumineuse (max ${MAX_VIDEO_SIZE_MB}MB)`);
          continue;
        }
        
        if (!file.type.startsWith('video/')) continue;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/videos/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        const { error } = await supabase.storage
          .from('photos')
          .upload(fileName, file);
        
        if (error) continue;
        
        const { data: urlData } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);
        
        if (urlData?.publicUrl) {
          newUrls.push(urlData.publicUrl);
        }
      }
      
      if (newUrls.length > 0) {
        const updatedUrls = [...videoUrls, ...newUrls];
        setVideoUrls(updatedUrls);
        
        // Save to database immediately
        await supabase
          .from('artisans')
          .update({ video_urls: updatedUrls })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error('Video upload error:', err);
    }
    
    setUploadingVideo(false);
    e.target.value = '';
  };

  // Remove video
  const removeVideo = async (index: number) => {
    if (!user) return;
    
    const updatedUrls = videoUrls.filter((_, i) => i !== index);
    setVideoUrls(updatedUrls);
    
    await supabase
      .from('artisans')
      .update({ video_urls: updatedUrls })
      .eq('id', user.id);
  };

  // Upload photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    setUploadingPhoto(true);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage
        .from('photos')
        .getPublicUrl(fileName);
      
      if (data?.publicUrl) {
        setAvatarUrl(data.publicUrl);
        
        // Update profile immediately
        await supabase
          .from('profiles')
          .update({ avatar_url: data.publicUrl })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error('Photo upload error:', err);
    }
    
    setUploadingPhoto(false);
  };

  // Save profile
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Construire une chaîne de localisation pour compatibilité (ex: "Région, Département, Commune")
      const locationParts = [region, department, commune].filter((v) => v && v.trim().length > 0);
      const locationString = locationParts.join(', ') || null;

      // Déterminer le rôle de manière fiable avec PRIORITÉ aux sources explicites :
      // 1. En mode onboarding : rôle de l'URL ou localStorage (choix explicite de l'utilisateur)
      // 2. Si categoryId est renseigné, c'est FORCÉMENT un artisan (car seul les artisans ont une catégorie)
      // 3. Sinon, utiliser le rôle du profil existant ou 'client' par défaut
      let finalRole: 'client' | 'artisan';
      
      // PRIORITÉ ABSOLUE pour onboarding : utiliser le rôle choisi explicitement par l'utilisateur
      if (isOnboarding && (roleFromUrl || roleFromStorage)) {
        finalRole = (roleFromUrl || roleFromStorage) as 'client' | 'artisan';
        console.log('[EditProfilePage] Rôle déterminé depuis choix utilisateur (onboarding):', finalRole, {
          roleFromUrl,
          roleFromStorage
        });
      } else if (categoryId) {
        // Si categoryId est renseigné, c'est forcément un artisan
        finalRole = 'artisan';
        console.log('[EditProfilePage] Rôle déterminé: artisan (categoryId présent:', categoryId, ')');
      } else {
        // Sinon, utiliser le rôle existant ou 'client' par défaut
        finalRole = (profile?.role as 'client' | 'artisan') || 'client';
        console.log('[EditProfilePage] Rôle déterminé depuis profil existant ou défaut:', finalRole);
      }
      
      console.log('[EditProfilePage] Sauvegarde du profil avec rôle:', finalRole, {
        isArtisan,
        roleFromUrl,
        roleFromStorage,
        profileRole: profile?.role,
        categoryId,
        totalSteps,
        currentStep,
      });

      // Upsert profile (crée la ligne si elle n'existe pas encore)
      // Pour les clients : company_name doit être null (pas d'entreprise)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          role: finalRole, // IMPORTANT : garantir le bon rôle
          full_name: fullName,
          phone: phone || null,
          location: locationString,
          company_name: isArtisan ? (companyName || null) : null, // UNIQUEMENT pour les artisans
          region: region || null,
          department: department || null,
          commune: commune || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });
      
      if (profileError) throw profileError;
      
      // Update artisan data if applicable (artisan depuis profil OU depuis URL)
      // Utiliser finalRole qui est la source de vérité la plus fiable
      if (finalRole === 'artisan') {
        // Si categoryId n'est pas renseigné, c'est une erreur pour un artisan
        if (!categoryId) {
          console.error('[EditProfilePage] ERREUR: Rôle artisan mais categoryId manquant!', {
            finalRole,
            categoryId,
            isArtisan,
            roleFromUrl,
          });
          showError('Veuillez sélectionner votre métier pour continuer.');
          setLoading(false);
          return;
        }

        const { error: artisanError } = await supabase
          .from('artisans')
          .upsert({
            id: user.id,
            user_id: user.id,
            category_id: categoryId,
            specialty: specialty || null,
            bio: bio || null,
            portfolio_urls: portfolioUrls.length > 0 ? portfolioUrls : null,
            video_urls: videoUrls.length > 0 ? videoUrls : null,
            updated_at: new Date().toISOString(),
          });
        
        if (artisanError) {
          console.error('[EditProfilePage] Erreur lors de la sauvegarde artisan:', artisanError);
          throw artisanError;
        }
        
        console.log('[EditProfilePage] Données artisan sauvegardées avec succès');
      }
      
      // Vérifier que le rôle a bien été sauvegardé
      const { data: savedProfile, error: checkError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (!checkError && savedProfile) {
        console.log('[EditProfilePage] Vérification après sauvegarde - Rôle en base:', savedProfile.role);
        if (savedProfile.role !== finalRole) {
          console.error('[EditProfilePage] ERREUR: Le rôle sauvegardé ne correspond pas!', {
            attendu: finalRole,
            obtenu: savedProfile.role,
          });
          showError('Une erreur est survenue lors de la sauvegarde du rôle. Veuillez réessayer.');
          setLoading(false);
          return;
        }
      }
      
      setSuccess(true);
      
      // Nettoyer localStorage après sauvegarde réussie
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mbourake_pending_role');
        localStorage.removeItem('mbourake_pending_mode');
      }
      
      // Utiliser window.location au lieu de navigate pour éviter l'erreur removeChild
      // lors de la navigation après sauvegarde
      setTimeout(() => {
        try {
          if (isMounted && typeof window !== 'undefined') {
            window.location.href = '/dashboard';
          }
        } catch (e) {
          console.warn('[EditProfilePage] Erreur lors de la navigation:', e);
        }
      }, 1500);
      
    } catch (err) {
      console.error('[EditProfilePage] Save error:', err);
      showError('Une erreur est survenue lors de la sauvegarde du profil.');
    }
    
    setLoading(false);
  };

  // Logs de débogage pour diagnostiquer les problèmes d'affichage
  // Utiliser useRef pour éviter les logs répétés inutiles
  const lastLogRef = useRef<string>('');
  useEffect(() => {
    const currentState = JSON.stringify({
      isOnboarding,
      roleFromUrl,
      profileRole: profile?.role,
      isArtisan,
      profileExists: !!profile,
      profileId: profile?.id,
      userId: user?.id,
    });
    
    // Ne logger que si l'état a vraiment changé
    if (currentState !== lastLogRef.current) {
      console.log('[EditProfilePage] État actuel:', {
        isOnboarding,
        roleFromUrl,
        profileRole: profile?.role,
        isArtisan,
        profileExists: !!profile,
        profileId: profile?.id,
        userId: user?.id,
        urlSearch: window.location.search,
      });
      lastLogRef.current = currentState;
    }
  }, [isOnboarding, roleFromUrl, profile?.role, isArtisan, profile, user?.id]);

  // Validation des étapes
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: // Informations personnelles
        return !!fullName.trim();
      case 2: // Localisation
        return !!region && !!department && !!commune;
      case 3: // Informations professionnelles (artisan uniquement)
        if (!isArtisan) return true;
        return !!categoryId;
      case 4: // Portfolio (artisan uniquement, optionnel)
        return true;
      case 5: // Affiliation (artisan uniquement, optionnel)
        return true;
      default:
        return true;
    }
  };

  const canGoToNextStep = validateStep(currentStep);
  const canGoToPreviousStep = currentStep > 1;

  const handleNext = () => {
    if (!isMounted) return; // Éviter les actions si le composant est en train de se démonter
    if (!canGoToNextStep || currentStep >= totalSteps) return;
    
    try {
      // Fermer le dropdown de recherche avant de changer d'étape
      setIsCategoryDropdownOpen(false);
      
      // Utiliser startTransition pour marquer cette mise à jour comme non urgente
      // Cela évite les conflits avec le cycle de rendu React
      startTransition(() => {
        if (!isMounted) return;
        try {
          setCurrentStep(currentStep + 1);
          // Utiliser requestAnimationFrame pour le scroll
          requestAnimationFrame(() => {
            if (!isMounted) return;
            try {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (e) {
              // Ignorer les erreurs de scroll si le composant est démonté
            }
          });
        } catch (e) {
          // Ignorer les erreurs silencieusement
        }
      });
    } catch (e) {
      // Ignorer les erreurs silencieusement
    }
  };

  const handlePrevious = () => {
    if (!isMounted) return; // Éviter les actions si le composant est en train de se démonter
    if (!canGoToPreviousStep) return;
    
    try {
      // Fermer le dropdown de recherche avant de changer d'étape
      setIsCategoryDropdownOpen(false);
      
      // Utiliser startTransition pour marquer cette mise à jour comme non urgente
      // Cela évite les conflits avec le cycle de rendu React
      startTransition(() => {
        if (!isMounted) return;
        try {
          setCurrentStep(currentStep - 1);
          // Utiliser requestAnimationFrame pour le scroll
          requestAnimationFrame(() => {
            if (!isMounted) return;
            try {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (e) {
              // Ignorer les erreurs de scroll si le composant est démonté
            }
          });
        } catch (e) {
          // Ignorer les erreurs silencieusement
        }
      });
    } catch (e) {
      // Ignorer les erreurs silencieusement
    }
  };

  // Fermer le dropdown de recherche de métier quand on clique en dehors ou change d'étape
  useEffect(() => {
    // Fermer le dropdown si on change d'étape
    setIsCategoryDropdownOpen(false);
  }, [currentStep]);

  // Utiliser useRef pour stabiliser le gestionnaire d'événements
  const handleClickOutsideRef = useRef<((event: MouseEvent) => void) | null>(null);

  useEffect(() => {
    if (!isCategoryDropdownOpen || currentStep !== 3) {
      // Nettoyer si le dropdown est fermé ou qu'on n'est plus à l'étape 3
      if (handleClickOutsideRef.current) {
        document.removeEventListener('click', handleClickOutsideRef.current, true);
        handleClickOutsideRef.current = null;
      }
      return;
    }

    // Créer le gestionnaire une seule fois et le stocker dans la ref
    if (!handleClickOutsideRef.current) {
      handleClickOutsideRef.current = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        // Ne pas fermer si on clique sur le conteneur de recherche ou ses enfants (y compris les boutons dans le dropdown)
        const container = target.closest('.category-search-container');
        const dropdownItem = target.closest('[data-category-item]');
        if (!container && !dropdownItem) {
          setIsCategoryDropdownOpen(false);
        }
      };
    }

    // Utiliser un délai pour permettre au clic sur le bouton de se propager d'abord
    const timeoutId = setTimeout(() => {
      if (handleClickOutsideRef.current) {
        document.addEventListener('click', handleClickOutsideRef.current, true);
      }
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      if (handleClickOutsideRef.current) {
        document.removeEventListener('click', handleClickOutsideRef.current, true);
        handleClickOutsideRef.current = null;
      }
    };
  }, [isCategoryDropdownOpen, currentStep]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button 
              onClick={() => {
                if (isOnboarding) {
                  navigate('/');
                } else {
                  navigate('/dashboard');
                }
              }}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-bold text-gray-900 flex-1">
              {isOnboarding
                ? roleFromUrl === 'artisan' || roleFromStorage === 'artisan'
                  ? 'Complétez votre profil artisan'
                  : roleFromUrl === 'client' || roleFromStorage === 'client'
                  ? 'Complétez votre profil client'
                  : 'Complétez votre profil'
                : 'Modifier mon profil'}
            </h1>
            {success && (
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-in zoom-in">
                <Check size={16} className="text-white" />
              </div>
            )}
          </div>
          
          {/* Indicateur de progression */}
          <div className="w-full">
            <div className="flex items-center justify-between mb-2">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                const isAccessible = currentStep >= step.id;
                
                return (
                  <React.Fragment key={`step-${step.id}-${index}`}>
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-brand-500 text-white'
                            : isActive
                            ? 'bg-brand-500 text-white ring-4 ring-brand-200'
                            : isAccessible
                            ? 'bg-gray-200 text-gray-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {isCompleted ? (
                          <Check size={18} />
                        ) : (
                          <StepIcon size={18} />
                        )}
                      </div>
                      <p className={`text-[10px] font-bold mt-1 text-center max-w-[60px] ${
                        isActive ? 'text-brand-600' : 'text-gray-500'
                      }`}>
                        {step.title.split(' ')[0]}
                      </p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-1 mx-1 transition-all ${
                        isCompleted ? 'bg-brand-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            <div className="text-center mt-2">
              <p className="text-xs font-bold text-gray-600">
                Étape {currentStep} sur {totalSteps}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Message d'accueil pour les utilisateurs en onboarding */}
        {isOnboarding && (roleFromUrl === 'artisan' || roleFromStorage === 'artisan') && currentStep === 1 && (
          <div className="bg-brand-50 border-2 border-brand-200 rounded-xl p-4 mb-6 animate-in fade-in">
            <h2 className="font-black text-brand-900 mb-2 text-lg">
              Bienvenue ! 👋
            </h2>
            <p className="text-sm text-brand-700 font-medium">
              Complétez votre profil en quelques étapes simples pour commencer à recevoir des demandes de clients.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ÉTAPE 1 : Informations personnelles */}
          {currentStep === 1 && isMounted && (
            <div key="step-1" className="animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-black text-gray-900 mb-6">Informations personnelles</h2>
              
              {/* Photo */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 p-1">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={48} className="text-brand-300" />
                      )}
                    </div>
                  </div>
                  <label className="absolute bottom-0 right-0 w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white shadow-lg cursor-pointer hover:bg-brand-600 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    {uploadingPhoto ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Camera size={18} />
                    )}
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Appuyez pour changer la photo
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Nom complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none bg-white"
                  placeholder="Votre nom complet"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none bg-white"
                  placeholder="+221 77 000 00 00"
                />
              </div>
            </div>
          )}

          {/* ÉTAPE 2 : Localisation */}
          {currentStep === 2 && isMounted && (
            <div key="step-2" className="animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-black text-gray-900 mb-6">Localisation</h2>
              
              {/* Region */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Région <span className="text-red-500">*</span>
                </label>
                <select
                  value={region}
                  onChange={(e) => {
                    const newRegion = e.target.value;
                    setRegion(newRegion);
                    setDepartment('');
                    setCommune('');
                  }}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none bg-white appearance-none"
                  required
                >
                  <option value="">Sélectionnez une région</option>
                  {senegalRegions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Département <span className="text-red-500">*</span>
                </label>
                <select
                  value={department}
                  onChange={(e) => {
                    const newDept = e.target.value;
                    setDepartment(newDept);
                    setCommune('');
                  }}
                  disabled={!region}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none bg-white appearance-none disabled:bg-gray-100 disabled:text-gray-400"
                  required
                >
                  <option value="">
                    {region ? 'Sélectionnez un département' : "Choisissez d'abord une région"}
                  </option>
                  {getDepartmentsForRegion(region).map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Commune */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Commune <span className="text-red-500">*</span>
                </label>
                <select
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  disabled={!region || !department}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none bg-white appearance-none disabled:bg-gray-100 disabled:text-gray-400"
                  required
                >
                  <option value="">
                    {department ? 'Sélectionnez une commune' : "Choisissez d'abord un département"}
                  </option>
                  {getCommunesForDepartment(region, department).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ÉTAPE 3 : Informations professionnelles (artisan uniquement) */}
          {currentStep === 3 && isArtisan && isMounted && (
            <div key="step-3" className="animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-black text-gray-900 mb-6">Informations professionnelles</h2>
              
              {/* Company name */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Nom de l'entreprise
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none bg-white"
                  placeholder="Ex: Entreprise Ndiaye & Fils"
                />
              </div>

              {/* Category - OBLIGATOIRE avec recherche */}
              <div className="relative category-search-container">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Métier / Catégorie <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                    <Search size={18} className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCategorySearch(value);
                      setIsCategoryDropdownOpen(true);
                      // Si on efface tout, on efface aussi la sélection
                      if (!value) {
                        setCategoryId(null);
                      } else {
                        // Si on tape quelque chose de différent du métier sélectionné, on efface la sélection
                        const selectedCategoryName = categoryId ? categories.find(c => c.id === categoryId)?.name : null;
                        if (selectedCategoryName && value !== selectedCategoryName) {
                          setCategoryId(null);
                        }
                      }
                    }}
                    onFocus={() => setIsCategoryDropdownOpen(true)}
                    placeholder="Rechercher un métier..."
                    className={`w-full rounded-xl border pl-12 pr-4 py-3 focus:border-brand-500 focus:outline-none bg-white ${
                      !categoryId ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {categoryId && (
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryId(null);
                        setCategorySearch('');
                        setIsCategoryDropdownOpen(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                
                {/* Liste déroulante des résultats */}
                {isCategoryDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                    {(() => {
                      const filteredCategories = categories.filter(cat =>
                        cat.name.toLowerCase().includes(categorySearch.toLowerCase())
                      );
                      
                      if (filteredCategories.length === 0) {
                        return (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            Aucun métier trouvé
                          </div>
                        );
                      }
                      
                      return filteredCategories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          data-category-item
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCategoryId(cat.id);
                            setCategorySearch(cat.name);
                            setIsCategoryDropdownOpen(false);
                          }}
                          onMouseDown={(e) => {
                            // Empêcher le blur de l'input
                            e.preventDefault();
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-brand-50 transition-colors ${
                            categoryId === cat.id ? 'bg-brand-100 font-bold' : ''
                          }`}
                        >
                          {cat.name}
                        </button>
                      ));
                    })()}
                  </div>
                )}
                
                {!categoryId && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-700 font-bold">
                      ⚠️ Vous devez choisir votre métier pour continuer
                    </p>
                  </div>
                )}
              </div>

              {/* Specialty */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Spécialité
                </label>
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none bg-white"
                  placeholder="Ex: Réparation de fuites"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  À propos de vous
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none bg-white resize-none"
                  placeholder="Décrivez votre expérience et savoir-faire..."
                />
              </div>
            </div>
          )}

          {/* ÉTAPE 4 : Portfolio (artisan uniquement) */}
          {currentStep === 4 && isArtisan && isMounted && (
            <div key="step-4" className="animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-black text-gray-900 mb-6">Portfolio</h2>
              
              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-700 font-medium">
                  📸 Les photos et vidéos sont visibles sur votre profil public et aident les clients à mieux connaître votre travail.
                </p>
              </div>

              {/* Photos Section */}
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Image size={18} className="text-brand-500" />
                    Photos ({portfolioUrls.length}/{MAX_PHOTOS})
                  </h3>
                </div>
                
                {/* Upload Zone */}
                <div className="relative mb-4">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePortfolioUpload}
                    disabled={uploadingPortfolio || portfolioUrls.length >= MAX_PHOTOS}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                    uploadingPortfolio ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/50'
                  }`}>
                    {uploadingPortfolio ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 size={28} className="animate-spin text-brand-500" />
                        <p className="text-sm font-bold text-brand-600">Upload en cours...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload size={28} className="text-gray-400" />
                        <p className="font-bold text-gray-600">Ajouter des photos</p>
                        <p className="text-xs text-gray-400">JPG, PNG (max {MAX_PHOTO_SIZE_MB}MB par photo)</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Photos Grid */}
                {portfolioUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {portfolioUrls.map((url, index) => (
                      <div key={`portfolio-${url}-${index}`} className="relative aspect-square rounded-xl overflow-hidden group">
                        <img 
                          src={url} 
                          alt={`Portfolio ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removePortfolioPhoto(index)}
                          className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Videos Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Video size={18} className="text-brand-500" />
                    Vidéos ({videoUrls.length}/{MAX_VIDEOS})
                  </h3>
                </div>
                
                {/* Upload Zone */}
                <div className="relative mb-4">
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={handleVideoUpload}
                    disabled={uploadingVideo || videoUrls.length >= MAX_VIDEOS}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                    uploadingVideo ? 'border-brand-300 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-brand-50/50'
                  }`}>
                    {uploadingVideo ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 size={28} className="animate-spin text-brand-500" />
                        <p className="text-sm font-bold text-brand-600">Upload en cours...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Video size={28} className="text-gray-400" />
                        <p className="font-bold text-gray-600">Ajouter des vidéos</p>
                        <p className="text-xs text-gray-400">MP4, MOV (max {MAX_VIDEO_SIZE_MB}MB par vidéo)</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Videos Grid */}
                {videoUrls.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {videoUrls.map((url, index) => (
                      <div key={index} className="relative aspect-video rounded-xl overflow-hidden group bg-gray-900">
                        <video 
                          src={url}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Play size={32} className="text-white" fill="white" />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeVideo(index)}
                          className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* ÉTAPE 5 : Affiliation (artisan uniquement) */}
          {currentStep === 5 && isArtisan && isMounted && user?.id && (
            <div key="step-5" className="animate-in fade-in slide-in-from-right-4">
              <h2 className="text-xl font-black text-gray-900 mb-6">Affiliation</h2>
              <AffiliationSection artisanId={user.id} />
            </div>
          )}

          {/* Boutons de navigation */}
          <ErrorBoundary>
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-20">
              <div className="max-w-lg mx-auto flex gap-3">
                {canGoToPreviousStep && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-xl py-3 font-bold hover:bg-gray-200 transition-colors"
                  >
                    <ChevronLeft size={20} />
                    Précédent
                  </button>
                )}
                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canGoToNextStep}
                    className="flex-1 flex items-center justify-center gap-2 bg-brand-500 text-white rounded-xl py-3 font-bold hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                    <ChevronRight size={20} />
                  </button>
                ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    const form = document.querySelector('form');
                    if (form) {
                      form.requestSubmit();
                    } else {
                      handleSubmit(e as any);
                    }
                  }}
                  disabled={loading || !canGoToNextStep}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-900 text-white rounded-xl py-3 font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Check size={20} />
                      Enregistrer
                    </>
                  )}
                </button>
              )}
              </div>
            </div>
          </ErrorBoundary>
        </form>

      </main>
    </div>
  );
}
