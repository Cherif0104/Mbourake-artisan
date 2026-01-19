import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, Loader2, User, Check, Image, Video, X, Upload, Play } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { useDiscovery } from '../hooks/useDiscovery';
import { useToastContext } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';

const MAX_PHOTOS = 10;
const MAX_VIDEOS = 5;
const MAX_PHOTO_SIZE_MB = 5;
const MAX_VIDEO_SIZE_MB = 50;

const senegalRegions = [
  'Dakar', 'Thiès', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine',
  'Kolda', 'Ziguinchor', 'Sédhiou', 'Saint-Louis', 'Louga', 'Matam',
  'Tambacounda', 'Kédougou'
];

export function EditProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { categories } = useDiscovery();
  const { error: showError } = useToastContext();
  
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'portfolio'>(
    searchParams.get('tab') === 'portfolio' ? 'portfolio' : 'info'
  );
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  // Artisan-specific fields
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [specialty, setSpecialty] = useState('');
  const [bio, setBio] = useState('');
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);

  // Load existing profile data
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
      setLocation(profile.location || '');
      setAvatarUrl(profile.avatar_url);
      
      // Load artisan data if applicable
      if (profile.role === 'artisan') {
        loadArtisanData();
      }
    }
  }, [profile]);

  const loadArtisanData = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('artisans')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setCategoryId(data.category_id);
      setSpecialty(data.specialty || '');
      setBio(data.bio || '');
      setPortfolioUrls(data.portfolio_urls || []);
      setVideoUrls(data.video_urls || []);
    }
  };

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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          location: location || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (profileError) throw profileError;
      
      // Update artisan data if applicable
      if (profile?.role === 'artisan') {
        const { error: artisanError } = await supabase
          .from('artisans')
          .update({
            category_id: categoryId,
            specialty: specialty || null,
            bio: bio || null,
            location: location || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
        
        if (artisanError) throw artisanError;
      }
      
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
      
    } catch (err) {
      console.error('Save error:', err);
    }
    
    setLoading(false);
  };

  const isArtisan = profile?.role === 'artisan';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-gray-900 flex-1">Modifier mon profil</h1>
          {success && (
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-in zoom-in">
              <Check size={16} className="text-white" />
            </div>
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-8">
        {/* Tabs for Artisans */}
        {isArtisan && (
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${
                activeTab === 'info'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Informations
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('portfolio')}
              className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${
                activeTab === 'portfolio'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Portfolio
            </button>
          </div>
        )}

        {/* Portfolio Tab */}
        {isArtisan && activeTab === 'portfolio' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Photos Section */}
            <section>
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
                    <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
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

            {/* Info */}
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-sm text-blue-700">
                📸 Les photos et vidéos sont visibles sur votre profil public et aident les clients à mieux connaître votre travail.
              </p>
            </div>
          </div>
        )}

        {/* Info Tab / Form */}
        {(!isArtisan || activeTab === 'info') && (
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Photo */}
          <div className="flex flex-col items-center">
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
              Nom complet
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

          {/* Location */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Région
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none bg-white appearance-none"
            >
              <option value="">Sélectionnez une région</option>
              {senegalRegions.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          {/* Artisan-specific fields */}
          {isArtisan && (
            <>
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs font-bold text-brand-500 uppercase tracking-wider mb-4">
                  Informations professionnelles
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Métier
                </label>
                <select
                  value={categoryId ?? ''}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand-500 focus:outline-none bg-white appearance-none"
                >
                  <option value="">Sélectionnez un métier</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
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
            </>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded-xl py-4 font-bold hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              'Enregistrer'
            )}
          </button>
        </form>
        )}
      </main>
    </div>
  );
}
