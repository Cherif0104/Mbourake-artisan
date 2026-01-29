import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Camera, UploadCloud, Users, UserCheck, MapPin, 
  Star, Calendar, Clock, ChevronDown, Search, Mic, X, AlertCircle,
  Home, Video, TrendingUp, Info, FileText
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useDiscovery } from '../hooks/useDiscovery';
import { useProjects } from '../hooks/useProjects';
import { AudioRecorder } from '../components/AudioRecorder';
import { supabase } from '../lib/supabase';
import { notifyArtisansNewProject } from '../lib/notificationService';

const senegalRegions = [
  'Dakar', 'Thiès', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine',
  'Kolda', 'Ziguinchor', 'Sédhiou', 'Saint-Louis', 'Louga', 'Matam',
  'Tambacounda', 'Kédougou'
];

const DISTANCE_OPTIONS = [5, 10, 20, 50, 100];
const RATING_OPTIONS = [1, 2, 3, 4, 5];

export function CreateProjectPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { categories } = useDiscovery();
  const { createProject, loading: projectLoading } = useProjects();

  // Basic fields
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [location, setLocation] = useState('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [textDescription, setTextDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  // New fields for criteria
  const [isOpen, setIsOpen] = useState(true); // true = open, false = targeted
  const [targetArtisanId, setTargetArtisanId] = useState<string | null>(null);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTimeStart, setPreferredTimeStart] = useState('');
  const [preferredTimeEnd, setPreferredTimeEnd] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [propertyDetails, setPropertyDetails] = useState({
    type: '', // appartement, maison, bureau, etc.
    accessNotes: '',
  });

  // UI states
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Price estimation
  const [priceEstimate, setPriceEstimate] = useState<{
    min: number;
    max: number;
    avg: number;
    count: number;
  } | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const selectedCategory = categories.find(c => c.id === categoryId);

  // Fetch price estimate when category changes
  useEffect(() => {
    const fetchPriceEstimate = async () => {
      if (!categoryId) {
        setPriceEstimate(null);
        return;
      }
      
      setLoadingEstimate(true);
      
      // Get quotes for projects in this category
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id')
        .eq('category_id', categoryId);
      
      if (!projectsData || projectsData.length === 0) {
        setPriceEstimate(null);
        setLoadingEstimate(false);
        return;
      }
      
      const projectIds = projectsData.map(p => p.id);
      
      const { data: quotesData } = await supabase
        .from('quotes')
        .select('amount')
        .in('project_id', projectIds)
        .eq('status', 'accepted')
        .not('amount', 'is', null);
      
      if (quotesData && quotesData.length >= 3) {
        const amounts = quotesData.map(q => Number(q.amount)).filter(a => a > 0);
        const min = Math.min(...amounts);
        const max = Math.max(...amounts);
        const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        
        setPriceEstimate({
          min: Math.round(min / 1000) * 1000,
          max: Math.round(max / 1000) * 1000,
          avg: Math.round(avg / 1000) * 1000,
          count: amounts.length
        });
      } else {
        setPriceEstimate(null);
      }
      
      setLoadingEstimate(false);
    };
    
    fetchPriceEstimate();
  }, [categoryId]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newPhotos = Array.from(e.target.files);
      if (photos.length + newPhotos.length <= 5) {
        setPhotos(prev => [...prev, ...newPhotos]);
      }
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVideoFile(e.target.files[0]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Check if time is outside business hours (8h-19h)
  const checkUrgency = () => {
    if (preferredTimeStart) {
      const hour = parseInt(preferredTimeStart.split(':')[0]);
      if (hour < 8 || hour >= 19) {
        setIsUrgent(true);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.user) {
      setError("Vous devez être connecté pour créer un projet");
      return;
    }
    if (!categoryId) {
      setError("Veuillez choisir une catégorie");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Vérifier la validité de la session avant de continuer
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error("Votre session a expiré. Veuillez vous reconnecter.");
      }

      let audioUrl = '';
      let videoUrl = '';
      let photoUrls: string[] = [];

      // 1. Upload Audio
      if (audioBlob) {
        const fileName = `${auth.user.id}/projects/${Date.now()}.webm`;
        const { data: audioData, error: audioError } = await supabase.storage
          .from('audio')
          .upload(fileName, audioBlob);
        
        if (audioError) throw audioError;
        audioUrl = supabase.storage.from('audio').getPublicUrl(audioData.path).data.publicUrl;
      }

      // 2. Upload Video (bucket dédié 'videos' : le bucket 'photos' n'accepte pas video/mp4)
      if (videoFile) {
        const ext = videoFile.name.split('.').pop()?.toLowerCase() || 'mp4';
        const fileName = `${auth.user.id}/projects/${Date.now()}-video.${ext}`;
        const { data: videoData, error: videoError } = await supabase.storage
          .from('videos')
          .upload(fileName, videoFile, { contentType: videoFile.type || 'video/mp4' });
        
        if (videoError) throw videoError;
        videoUrl = supabase.storage.from('videos').getPublicUrl(videoData.path).data.publicUrl;
      }

      // 3. Upload Photos
      for (const photo of photos) {
        const fileName = `${auth.user.id}/projects/${Date.now()}-${photo.name}`;
        const { data: photoData, error: photoError } = await supabase.storage
          .from('photos')
          .upload(fileName, photo);
        
        if (photoError) throw photoError;
        photoUrls.push(supabase.storage.from('photos').getPublicUrl(photoData.path).data.publicUrl);
      }

      // 4. Prepare property_details - ensure floor is not an empty string if present
      let propertyDetailsJson = null;
      if (propertyDetails.type) {
        propertyDetailsJson = {
          type: propertyDetails.type,
          accessNotes: propertyDetails.accessNotes || null,
          // floor est supprimé car il peut causer des problèmes si c'est un integer
        };
      }

      // 5. Create Project with all new fields
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          client_id: auth.user.id,
          category_id: categoryId,
          title: title || "Projet sans titre",
          description: (textDescription || '').trim() || null,
          audio_description_url: audioUrl || null,
          video_url: videoUrl || null,
          photos_urls: photoUrls,
          location: location || null,
          is_open: isOpen,
          target_artisan_id: !isOpen ? targetArtisanId : null,
          max_distance_km: isOpen ? (maxDistanceKm !== null ? Number(maxDistanceKm) : null) : null,
          min_rating: isOpen ? (minRating !== null ? Number(minRating) : null) : null,
          preferred_date: preferredDate || null,
          preferred_time_start: preferredTimeStart || null,
          preferred_time_end: preferredTimeEnd || null,
          is_urgent: isUrgent,
          property_details: propertyDetailsJson,
          status: 'open',
          expires_at: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days
        })
        .select()
        .single();

      if (projectError) {
        console.error('Erreur création projet:', projectError);
        // Message d'erreur plus détaillé
        let errorMessage = projectError.message;
        if (projectError.message?.includes('invalid input syntax for type integer')) {
          errorMessage = "Erreur de format de données. Veuillez vérifier les champs numériques (distance, note minimum).";
        } else if (projectError.message?.includes('row-level security policy')) {
          errorMessage = "Erreur d'autorisation. Veuillez vous reconnecter et réessayer.";
        }
        throw new Error(errorMessage);
      }

      // 6. Log création projet (traçabilité)
      if (newProject) {
        try {
          await supabase.rpc('log_project_action', {
            p_project_id: newProject.id,
            p_user_id: auth.user.id,
            p_action: 'created',
            p_new_value: {
              title: newProject.title,
              category_id: categoryId,
              status: 'open',
              is_open: isOpen,
              location: location || null
            },
            p_metadata: {
              has_audio: !!audioUrl,
              has_video: !!videoUrl,
              photos_count: photoUrls.length,
              is_urgent: isUrgent
            }
          });
        } catch (logErr) {
          console.error('Error logging project creation:', logErr);
          // Ne pas bloquer si le log échoue
        }

        // Notifier les artisans (en arrière-plan, ne pas bloquer)
        notifyArtisansNewProject({
          id: newProject.id,
          title: newProject.title || "Projet sans titre",
          category_id: categoryId,
          location: location || undefined,
          is_open: isOpen,
          target_artisan_id: !isOpen ? targetArtisanId || undefined : undefined,
          max_distance_km: isOpen ? maxDistanceKm || undefined : undefined,
          min_rating: isOpen ? minRating || undefined : undefined,
        }).catch(err => console.error('Error notifying artisans:', err));

        // Notifier le client de la création réussie
        try {
          await supabase.from('notifications').insert({
            user_id: auth.user.id,
            type: 'system',
            title: 'Projet créé avec succès',
            message: `Votre projet "${newProject.title || 'Projet sans titre'}" a été publié. Les artisans seront notifiés.`,
            data: { project_id: newProject.id }
          });
        } catch (notifErr) {
          console.error('Error notifying client:', notifErr);
        }
      }

      // Naviguer vers le dashboard
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      // Messages d'erreur plus clairs
      let errorMessage = err.message;
      if (err.message?.includes('row-level security policy')) {
        errorMessage = "Erreur d'autorisation. Veuillez vous reconnecter et réessayer.";
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('network')) {
        errorMessage = "Erreur de connexion. Vérifiez votre connexion internet et réessayez.";
      } else if (err.message?.includes('JWT') || err.message?.includes('token')) {
        errorMessage = "Votre session a expiré. Veuillez vous reconnecter.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header moderne — aligné dashboard */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-gray-100/50 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} 
              className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
              aria-label="Retour"
            >
              <ArrowLeft size={22} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-black text-gray-900">Publier un projet</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-gray-500">Étape {step} sur 3</span>
                <div className="flex gap-1">
                  {[1, 2, 3].map((s) => (
                    <span
                      key={s}
                      className={`w-2 h-2 rounded-full transition-all ${
                        s === step ? 'bg-brand-500 scale-110' : s < step ? 'bg-brand-300' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Barre de progression */}
        <div className="h-1 bg-gray-100">
          <div 
            className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-r-full transition-all duration-300 ease-out"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        <form onSubmit={handleSubmit}>
          
          {/* STEP 1: Description */}
          {step === 1 && (
            <div key="create-step-1" className="space-y-5 animate-in fade-in duration-300">
              {/* Hero étape 1 */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 p-1 shadow-lg shadow-brand-200/50 inline-flex items-center justify-center mb-4">
                  <div className="w-full h-full rounded-xl bg-white flex items-center justify-center">
                    <Mic size={28} className="text-brand-500" />
                  </div>
                </div>
                <h2 className="text-xl font-black text-gray-900">Décrivez votre besoin</h2>
                <p className="text-sm text-gray-500 mt-1.5">Message vocal, texte ou photos</p>
              </div>

              {/* Description écrite (optionnel) */}
              <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-glass">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                    <FileText size={16} className="text-brand-600" />
                  </span>
                  Description écrite (optionnel)
                </h3>
                <textarea
                  value={textDescription}
                  onChange={(e) => { setTextDescription(e.target.value); if (error) setError(null); }}
                  placeholder="Décrivez votre besoin par écrit si vous préférez ne pas enregistrer de message vocal..."
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none text-gray-900 placeholder:text-gray-400 resize-y min-h-[100px]"
                />
                <p className="text-xs text-gray-500 mt-2">Vous pouvez écrire, enregistrer un vocal ou les deux.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              {/* Message vocal */}
              <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-glass">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center justify-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                    <Mic size={16} className="text-brand-600" />
                  </span>
                  Message vocal
                </h3>
                <AudioRecorder 
                  onRecordingComplete={(blob) => setAudioBlob(blob)} 
                  onDelete={() => setAudioBlob(null)} 
                />
              </div>

              {/* Photos */}
              <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-glass">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center">
                    <Camera size={16} className="text-brand-600" />
                  </span>
                  Photos (max 5)
                </h3>
                <div className="flex gap-3 flex-wrap">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-white shadow-md">
                      <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {photos.length < 5 && (
                    <label className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors">
                      <Camera size={22} className="text-gray-400" />
                      <span className="text-[9px] text-gray-500 font-bold mt-1">PHOTO</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
                    </label>
                  )}
                </div>
              </div>

              {/* Vidéo (optionnel) */}
              <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-glass">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Video size={16} className="text-gray-600" />
                  </span>
                  Vidéo (optionnel)
                </h3>
                {videoFile ? (
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <Video size={20} className="text-brand-500 flex-shrink-0" />
                      <span className="text-sm text-gray-600 truncate">{videoFile.name}</span>
                    </div>
                    <button type="button" onClick={() => setVideoFile(null)} className="text-red-500 flex-shrink-0 p-1">
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <label className="block w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/20 transition-colors">
                    <Video size={24} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500 font-medium">Ajouter une vidéo</p>
                    <input type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
                  </label>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  const hasDescription = !!audioBlob || (textDescription || '').trim().length > 0 || photos.length > 0;
                  if (!hasDescription) {
                    setError('Décrivez votre besoin : message vocal, texte ou au moins une photo.');
                    return;
                  }
                  setError(null);
                  setStep(2);
                }}
                className="w-full bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 text-white rounded-xl py-4 font-bold shadow-cta hover:shadow-cta-hover hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-cta-active transition-all duration-200"
              >
                Continuer
              </button>
            </div>
          )}

          {/* STEP 2: Category & Location */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 p-1 shadow-lg shadow-brand-200/50 inline-flex items-center justify-center mb-4">
                  <div className="w-full h-full rounded-xl bg-white flex items-center justify-center">
                    <Search size={28} className="text-brand-500" />
                  </div>
                </div>
                <h2 className="text-xl font-black text-gray-900">Détails du projet</h2>
                <p className="text-sm text-gray-500 mt-1.5">Catégorie, localisation et préférences</p>
              </div>

              {/* Titre */}
              <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-glass">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Titre du projet</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                  placeholder="Ex: Réparation évier cuisine"
                />
              </div>

              {/* Catégorie */}
              <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-glass">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Catégorie *</label>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={categorySearch}
                    onChange={(e) => {
                      setCategorySearch(e.target.value);
                      setShowCategoryDropdown(true);
                    }}
                    onFocus={() => setShowCategoryDropdown(true)}
                    className="w-full rounded-xl border border-gray-200 pl-12 pr-4 py-3 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                    placeholder="Rechercher un métier..."
                  />
                  {selectedCategory && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 bg-brand-100 text-brand-600 text-xs font-bold px-2 py-1 rounded-lg">
                      {selectedCategory.name}
                    </span>
                  )}
                </div>
                {showCategoryDropdown && (
                  <div className="mt-2 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg">
                    {filteredCategories.length === 0 ? (
                      <p className="p-4 text-sm text-gray-400">Aucun résultat</p>
                    ) : (
                      filteredCategories.slice(0, 20).map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setCategoryId(cat.id);
                            setCategorySearch('');
                            setShowCategoryDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                            categoryId === cat.id ? 'bg-brand-50 text-brand-600' : 'text-gray-700'
                          }`}
                        >
                          {cat.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
                
                {/* Price Estimate */}
                {categoryId && (
                  <div className="mt-3">
                    {loadingEstimate ? (
                      <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-gray-500">Estimation en cours...</span>
                      </div>
                    ) : priceEstimate ? (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <TrendingUp size={20} className="text-green-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-green-800 mb-1">
                              Estimation de prix
                            </p>
                            <p className="text-xl font-black text-green-700">
                              {priceEstimate.min.toLocaleString('fr-FR')} - {priceEstimate.max.toLocaleString('fr-FR')} FCFA
                            </p>
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                              <Info size={10} />
                              Basé sur {priceEstimate.count} projets similaires
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-2">
                        <Info size={16} className="text-blue-500 flex-shrink-0" />
                        <p className="text-xs text-blue-600">
                          Pas assez de données pour estimer le prix. Les artisans vous proposeront leurs tarifs.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Localisation */}
              <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-glass">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center">
                    <MapPin size={14} className="text-brand-600" />
                  </span>
                  Localisation
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none appearance-none"
                >
                  <option value="">Sélectionnez une région</option>
                  {senegalRegions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>

              {/* Date et horaires */}
              <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-glass space-y-4">
                <label className="block text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center">
                    <Calendar size={14} className="text-brand-600" />
                  </span>
                  Date et horaires souhaités
                </label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold">De</label>
                    <input
                      type="time"
                      value={preferredTimeStart}
                      onChange={(e) => {
                        setPreferredTimeStart(e.target.value);
                        checkUrgency();
                      }}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold">À</label>
                    <input
                      type="time"
                      value={preferredTimeEnd}
                      onChange={(e) => setPreferredTimeEnd(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                </div>
                {isUrgent && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800 font-medium">
                      Intervention hors horaires normaux (8h-19h). Des frais supplémentaires peuvent s'appliquer.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!categoryId}
                className="w-full bg-brand-500 text-white rounded-xl py-4 font-bold hover:bg-brand-600 active:scale-[0.99] transition-all shadow-md shadow-brand-500/30 disabled:opacity-50 disabled:shadow-none"
              >
                Continuer
              </button>
            </div>
          )}

          {/* STEP 3: Criteria */}
          {step === 3 && (
            <div key="create-step-3" className="space-y-5 animate-in fade-in duration-300">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 p-1 shadow-lg shadow-brand-200/50 inline-flex items-center justify-center mb-4">
                  <div className="w-full h-full rounded-xl bg-white flex items-center justify-center">
                    <Users size={28} className="text-brand-500" />
                  </div>
                </div>
                <h2 className="text-xl font-black text-gray-900">Type de demande</h2>
                <p className="text-sm text-gray-500 mt-1.5">Ouverte à tous ou ciblée</p>
              </div>

              {/* Type de demande */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  className={`p-5 rounded-2xl border-2 transition-all text-left shadow-sm ${
                    isOpen 
                      ? 'border-brand-500 bg-brand-50 shadow-brand-200/30' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <Users size={26} className={`mb-2 ${isOpen ? 'text-brand-500' : 'text-gray-400'}`} />
                  <p className={`font-bold text-sm ${isOpen ? 'text-brand-700' : 'text-gray-700'}`}>Demande ouverte</p>
                  <p className="text-[10px] text-gray-500 mt-1">Tous les artisans peuvent répondre</p>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={`p-5 rounded-2xl border-2 transition-all text-left shadow-sm ${
                    !isOpen 
                      ? 'border-brand-500 bg-brand-50 shadow-brand-200/30' 
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <UserCheck size={26} className={`mb-2 ${!isOpen ? 'text-brand-500' : 'text-gray-400'}`} />
                  <p className={`font-bold text-sm ${!isOpen ? 'text-brand-700' : 'text-gray-700'}`}>Artisan spécifique</p>
                  <p className="text-[10px] text-gray-500 mt-1">Choisir un artisan précis</p>
                </button>
              </div>

              {isOpen && (
                <div className="space-y-4">
                  <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-glass">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-3">
                      Distance maximum
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setMaxDistanceKm(null)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          maxDistanceKm === null ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        Tous
                      </button>
                      {DISTANCE_OPTIONS.map(km => (
                        <button
                          key={km}
                          type="button"
                          onClick={() => setMaxDistanceKm(km)}
                          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            maxDistanceKm === km ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {km} km
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note minimum */}
                  <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-glass">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-3">
                      Note minimum
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setMinRating(null)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          minRating === null ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        Tous
                      </button>
                      {RATING_OPTIONS.map(rating => (
                        <button
                          key={rating}
                          type="button"
                          onClick={() => setMinRating(rating)}
                          className={`px-3 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1 ${
                            minRating === rating ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {rating}
                          <Star size={12} className={minRating === rating ? 'fill-white' : 'fill-yellow-400 text-yellow-400'} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Détails logement (optionnel) */}
              <div className="bg-white/85 backdrop-blur-xl rounded-2xl p-5 border border-white/60 shadow-glass">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Home size={14} className="text-gray-600" />
                  </span>
                  Détails du logement (optionnel)
                </label>
                <select
                  value={propertyDetails.type}
                  onChange={(e) => setPropertyDetails({ ...propertyDetails, type: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none appearance-none mb-3"
                >
                  <option value="">Type de bien</option>
                  <option value="appartement">Appartement</option>
                  <option value="maison">Maison</option>
                  <option value="bureau">Bureau</option>
                  <option value="commerce">Commerce</option>
                  <option value="autre">Autre</option>
                </select>

                {propertyDetails.type && (
                  <input
                    value={propertyDetails.accessNotes}
                    onChange={(e) => setPropertyDetails({ ...propertyDetails, accessNotes: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                    placeholder="Notes d'accès (code, étage, etc.)"
                  />
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-600 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || projectLoading || !categoryId}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-br from-brand-400 via-brand-500 to-brand-600 text-white rounded-xl py-4 font-bold shadow-cta hover:shadow-cta-hover hover:-translate-y-0.5 active:translate-y-0.5 active:shadow-cta-active transition-all duration-200 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
              >
                {loading || projectLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="inline-flex items-center justify-center gap-3">
                    <UploadCloud size={22} />
                    Publier ma demande
                  </span>
                )}
              </button>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
