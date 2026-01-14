import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface FavoriteArtisan {
  id: string;
  artisan_id: string;
  created_at: string;
  artisan: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    location: string | null;
    specialty: string | null;
    category: { name: string } | null;
  } | null;
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteArtisan[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Fetch all favorites for current user
  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const { data, error } = await supabase
      .from('favorites')
      .select(`
        id, artisan_id, created_at,
        profiles!favorites_artisan_id_fkey (
          id, full_name, avatar_url, location, specialty,
          categories (name)
        )
      `)
      .eq('client_id', user.id)
      .order('created_at', { ascending: false }) as { data: any[], error: any };

    if (error) {
      console.error('Error fetching favorites:', error);
    } else {
      const formattedFavorites = (data || []).map((fav: any) => ({
        id: fav.id,
        artisan_id: fav.artisan_id,
        created_at: fav.created_at,
        artisan: fav.profiles ? {
          id: fav.profiles.id,
          full_name: fav.profiles.full_name,
          avatar_url: fav.profiles.avatar_url,
          location: fav.profiles.location,
          specialty: fav.profiles.specialty,
          category: fav.profiles.categories,
        } : null,
      }));
      
      setFavorites(formattedFavorites);
      setFavoriteIds(new Set(formattedFavorites.map((f: FavoriteArtisan) => f.artisan_id)));
    }
    
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Check if artisan is favorited
  const isFavorite = useCallback((artisanId: string): boolean => {
    return favoriteIds.has(artisanId);
  }, [favoriteIds]);

  // Add to favorites
  const addFavorite = useCallback(async (artisanId: string): Promise<boolean> => {
    if (!user) return false;
    
    const { error } = await supabase
      .from('favorites')
      .insert({ client_id: user.id, artisan_id: artisanId });

    if (error) {
      console.error('Error adding favorite:', error);
      return false;
    }

    // Optimistic update
    setFavoriteIds(prev => new Set([...prev, artisanId]));
    fetchFavorites();
    return true;
  }, [user, fetchFavorites]);

  // Remove from favorites
  const removeFavorite = useCallback(async (artisanId: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('client_id', user.id)
      .eq('artisan_id', artisanId);

    if (error) {
      console.error('Error removing favorite:', error);
      return false;
    }

    // Optimistic update
    setFavoriteIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(artisanId);
      return newSet;
    });
    setFavorites(prev => prev.filter(f => f.artisan_id !== artisanId));
    return true;
  }, [user]);

  // Toggle favorite
  const toggleFavorite = useCallback(async (artisanId: string): Promise<boolean> => {
    if (isFavorite(artisanId)) {
      return removeFavorite(artisanId);
    } else {
      return addFavorite(artisanId);
    }
  }, [isFavorite, addFavorite, removeFavorite]);

  return {
    favorites,
    favoriteIds,
    loading,
    isFavorite,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    refresh: fetchFavorites,
  };
}
