// Utilitaires partagés pour les artisans
export type ArtisanTier = 'Platine' | 'Or' | 'Argent' | 'Bronze';

/**
 * Calcule le tier d'un artisan basé sur le nombre de projets complétés
 */
export const getTier = (projects: number): ArtisanTier => {
  if (projects >= 50) return 'Platine';
  if (projects >= 25) return 'Or';
  if (projects >= 10) return 'Argent';
  return 'Bronze';
};

/**
 * Couleurs Tailwind pour chaque tier
 */
export const TIER_COLORS: Record<ArtisanTier, string> = {
  'Platine': 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
  'Or': 'bg-gradient-to-r from-yellow-400 to-orange-400 text-white',
  'Argent': 'bg-gradient-to-r from-gray-400 to-gray-500 text-white',
  'Bronze': 'bg-gradient-to-r from-orange-300 to-orange-400 text-white',
};
