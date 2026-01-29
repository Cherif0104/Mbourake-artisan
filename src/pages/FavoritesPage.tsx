import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Heart, User, MapPin, Star, Briefcase,
  ChevronRight, Trash2
} from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { LoadingOverlay } from '../components/LoadingOverlay';

export function FavoritesPage() {
  const navigate = useNavigate();
  const { favorites, loading, removeFavorite } = useFavorites();

  const handleRemove = async (artisanId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await removeFavorite(artisanId);
  };

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">Mes favoris</h1>
            <p className="text-xs text-gray-400">{favorites.length} artisan{favorites.length > 1 ? 's' : ''} sauvegardé{favorites.length > 1 ? 's' : ''}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Heart size={20} className="text-red-500 fill-red-500" />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {favorites.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Heart size={40} className="text-gray-300" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">Aucun favori</h3>
            <p className="text-gray-500 text-sm mb-6">
              Sauvegardez vos artisans préférés pour les retrouver facilement
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-brand-500 text-white font-bold rounded-xl"
            >
              Découvrir les artisans
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(`/artisans/${fav.artisan_id}`)}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-xl bg-brand-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {fav.artisan?.avatar_url ? (
                      <img src={fav.artisan.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={28} className="text-brand-500" />
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 truncate">{fav.artisan?.full_name}</h3>
                    
                    {fav.artisan?.category && (
                      <div className="flex items-center gap-1 text-sm text-brand-600 mt-0.5">
                        <Briefcase size={12} />
                        <span>{fav.artisan.category.name}</span>
                      </div>
                    )}
                    
                    {fav.artisan?.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                        <MapPin size={12} />
                        <span>{fav.artisan.location}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleRemove(fav.artisan_id, e)}
                      className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                    <ChevronRight size={20} className="text-gray-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
