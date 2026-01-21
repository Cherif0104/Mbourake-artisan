import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Camera, UploadCloud, Users, UserCheck, MapPin, 
  Star, Calendar, Clock, ChevronDown, Search, Mic, X, AlertCircle,
  Home, Video, TrendingUp, Info
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

      // 2. Upload Video
      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop()?.toLowerCase() || 'mp4';
        const fileName = `${auth.user.id}/projects/${Date.now()}-video.${fileExt}`;
        
        // Déterminer le contentType selon le type de fichier
        let contentType = videoFile.type;
        if (!contentType || contentType === 'application/octet-stream') {
          // Déterminer le type MIME selon l'extension
          const mimeTypes: Record<string, string> = {
            'mp4': 'video/mp4',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
            'wmv': 'video/x-ms-wmv',
            'webm': 'video/webm',
            'ogg': 'video/ogg',
            '3gp': 'video/3gpp',
            'mkv': 'video/x-matroska',
          };
          contentType = mimeTypes[fileExt] || 'video/mp4';
        }
        
        const { data: videoData, error: videoError } = await supabase.storage
          .from('videos')
          .upload(fileName, videoFile, {
            contentType: contentType,
            upsert: false
          });
        
        if (videoError) {
          console.error('Video upload error:', videoError);
          throw new Error(`Erreur lors de l'upload de la vidéo: ${videoError.message}`);
        }
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-20 px-4 py-4 bg-white border-b border-gray-100 flex items-center gap-4">
        <button 
          onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)} 
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">Publier un Projet</h1>
          <p className="text-xs text-gray-400">Étape {step} sur 3</p>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-100">
        <div 
          className="h-full bg-brand-500 transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <main className="max-w-lg mx-auto px-4 py-6 pb-32">
        <form onSubmit={handleSubmit}>
          
          {/* STEP 1: Description */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mic size={28} className="text-brand-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Décrivez votre besoin</h2>
                <p className="text-sm text-gray-500 mt-1">Enregistrez un message vocal ou ajoutez des photos</p>
              </div>

              {/* Voice Recording */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 text-center">Message vocal</h3>
                <AudioRecorder 
                  onRecordingComplete={(blob) => setAudioBlob(blob)} 
                  onDelete={() => setAudioBlob(null)} 
                />
              </div>

              {/* Photos */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Photos (max 5)</h3>
                <div className="flex gap-3 flex-wrap">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden">
                      <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {photos.length < 5 && (
                    <label className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-brand-300 transition-colors">
                      <Camera size={20} className="text-gray-400" />
                      <span className="text-[9px] text-gray-400 font-bold mt-1">PHOTO</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
                    </label>
                  )}
                </div>
              </div>

              {/* Video */}
              <div className="bg-white rounded-2xl p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Vidéo (optionnel)</h3>
                {videoFile ? (
                  <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <Video size={20} className="text-brand-500" />
                      <span className="text-sm text-gray-600 truncate max-w-[200px]">{videoFile.name}</span>
                    </div>
                    <button type="button" onClick={() => setVideoFile(null)} className="text-red-500">
                      <X size={18} />
                    </button>
                  </div>
                ) : (
                  <label className="block w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-brand-300 transition-colors">
                    <Video size={24} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Ajouter une vidéo</p>
                    <input type="file" accept="video/*" className="hidden" onChange={handleVideoChange} />
                  </label>
                )}
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full bg-brand-500 text-white rounded-xl py-4 font-bold hover:bg-brand-600 transition-colors"
              >
                Continuer
              </button>
            </div>
          )}

          {/* STEP 2: Category & Location */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-gray-900">Détails du projet</h2>
                <p className="text-sm text-gray-500 mt-1">Catégorie, localisation et préférences</p>
              </div>

              {/* Title */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Titre du projet</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none"
                  placeholder="Ex: Réparation évier cuisine"
                />
              </div>

              {/* Category Search */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
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
                    className="w-full rounded-xl border border-gray-200 pl-12 pr-4 py-3 focus:border-brand-500 focus:outline-none"
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

              {/* Location */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                  <MapPin size={12} className="inline mr-1" />
                  Localisation
                </label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none appearance-none"
                >
                  <option value="">Sélectionnez une région</option>
                  {senegalRegions.map(region => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </div>

              {/* Date & Time Preferences */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-4">
                <label className="block text-xs font-bold text-gray-500 uppercase">
                  <Calendar size={12} className="inline mr-1" />
                  Date et horaires souhaités
                </label>
                
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none"
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
                  <div className="bg-yellow-50 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle size={16} className="text-yellow-600 mt-0.5" />
                    <p className="text-xs text-yellow-700">
                      Intervention hors horaires normaux (8h-19h). Des frais supplémentaires peuvent s'appliquer.
                    </p>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!categoryId}
                className="w-full bg-brand-500 text-white rounded-xl py-4 font-bold hover:bg-brand-600 transition-colors disabled:opacity-50"
              >
                Continuer
              </button>
            </div>
          )}

          {/* STEP 3: Criteria */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-gray-900">Type de demande</h2>
                <p className="text-sm text-gray-500 mt-1">Ouverte à tous ou ciblée</p>
              </div>

              {/* Request Type */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    isOpen 
                      ? 'border-brand-500 bg-brand-50' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <Users size={24} className={`mx-auto mb-2 ${isOpen ? 'text-brand-500' : 'text-gray-400'}`} />
                  <p className={`font-bold text-sm ${isOpen ? 'text-brand-600' : 'text-gray-700'}`}>Demande ouverte</p>
                  <p className="text-[10px] text-gray-400 mt-1">Tous les artisans peuvent répondre</p>
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    !isOpen 
                      ? 'border-brand-500 bg-brand-50' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <UserCheck size={24} className={`mx-auto mb-2 ${!isOpen ? 'text-brand-500' : 'text-gray-400'}`} />
                  <p className={`font-bold text-sm ${!isOpen ? 'text-brand-600' : 'text-gray-700'}`}>Artisan spécifique</p>
                  <p className="text-[10px] text-gray-400 mt-1">Choisir un artisan précis</p>
                </button>
              </div>

              {/* Criteria for Open Requests */}
              {isOpen && (
                <div className="space-y-4">
                  {/* Distance Filter */}
                  <div className="bg-white rounded-2xl p-4 border border-gray-100">
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

                  {/* Rating Filter */}
                  <div className="bg-white rounded-2xl p-4 border border-gray-100">
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

              {/* Property Details (optional) */}
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Home size={16} className="text-gray-400" />
                  <label className="text-xs font-bold text-gray-500 uppercase">Détails du logement (optionnel)</label>
                </div>
                
                <select
                  value={propertyDetails.type}
                  onChange={(e) => setPropertyDetails({ ...propertyDetails, type: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none appearance-none mb-3"
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
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none"
                    placeholder="Notes d'accès (code, étage, etc.)"
                  />
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || projectLoading || !categoryId}
                className="w-full flex items-center justify-center gap-3 bg-brand-500 text-white rounded-xl py-4 font-bold hover:bg-brand-600 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UploadCloud size={20} />
                    Publier ma demande
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
