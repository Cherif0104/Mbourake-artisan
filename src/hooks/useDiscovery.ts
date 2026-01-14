import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';

export type Category = Database['public']['Tables']['categories']['Row'];
export type ArtisanProfile = Database['public']['Tables']['artisans']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
};

// Fallback categories when API fails (for demo purposes)
const FALLBACK_CATEGORIES: Category[] = [
  { id: 1, name: 'Maçonnerie Générale', icon_name: 'hard-hat', slug: 'maconnerie-gen' },
  { id: 2, name: 'Maçonnerie de Finition', icon_name: 'hard-hat', slug: 'maconnerie-fin' },
  { id: 3, name: 'Ferraillage', icon_name: 'grid', slug: 'ferraillage' },
  { id: 4, name: 'Coffrage Bâtiment', icon_name: 'grid', slug: 'coffrage' },
  { id: 5, name: 'Charpente Métallique', icon_name: 'wrench', slug: 'charpente-met' },
  { id: 6, name: 'Charpente Bois', icon_name: 'hammer', slug: 'charpente-bois' },
  { id: 7, name: 'Plomberie Sanitaire', icon_name: 'droplets', slug: 'plomberie-san' },
  { id: 8, name: 'Plomberie Industrielle', icon_name: 'droplets', slug: 'plomberie-ind' },
  { id: 9, name: 'Installation Pompe à eau', icon_name: 'droplets', slug: 'pompe-eau' },
  { id: 10, name: 'Électricité Bâtiment', icon_name: 'zap', slug: 'elec-bat' },
  { id: 11, name: 'Électricité Industrielle', icon_name: 'zap', slug: 'elec-ind' },
  { id: 12, name: 'Électricité Solaire', icon_name: 'sun', slug: 'elec-sol' },
  { id: 13, name: 'Installation Paratonnerre', icon_name: 'cloud-lightning', slug: 'paratonnerre' },
  { id: 14, name: 'Peinture Intérieure', icon_name: 'paint-bucket', slug: 'peinture-int' },
  { id: 15, name: 'Peinture Extérieure', icon_name: 'paint-bucket', slug: 'peinture-ext' },
  { id: 16, name: 'Peinture Industrielle', icon_name: 'paint-bucket', slug: 'peinture-ind' },
  { id: 17, name: 'Carrelage & Dallage', icon_name: 'layout-grid', slug: 'carrelage' },
  { id: 18, name: 'Pose de Marbre', icon_name: 'layout-grid', slug: 'marbre' },
  { id: 19, name: 'Étanchéité Terrasse', icon_name: 'umbrella', slug: 'etancheite-ter' },
  { id: 20, name: 'Étanchéité Toiture', icon_name: 'umbrella', slug: 'etancheite-toit' },
  { id: 21, name: 'Menuiserie Bois Massif', icon_name: 'hammer', slug: 'menuiserie-bois-massif' },
  { id: 22, name: 'Menuiserie Aluminium', icon_name: 'grid', slug: 'menuiserie-alu' },
  { id: 23, name: 'Menuiserie PVC', icon_name: 'grid', slug: 'menuiserie-pvc' },
  { id: 24, name: 'Véranda & Pergola', icon_name: 'home', slug: 'veranda' },
  { id: 25, name: 'Plâtrerie & Staff', icon_name: 'layout', slug: 'platrerie' },
  { id: 26, name: 'Vitrerie & Miroiterie', icon_name: 'square', slug: 'vitrerie' },
  { id: 27, name: 'Soudure à l\'arc', icon_name: 'wrench', slug: 'soudure-arc' },
  { id: 28, name: 'Soudure Argon', icon_name: 'wrench', slug: 'soudure-argon' },
  { id: 29, name: 'Ferronnerie d\'Art', icon_name: 'anvil', slug: 'ferronnerie' },
  { id: 30, name: 'Climatisation Résidentielle', icon_name: 'cloud-lightning', slug: 'clim-res' },
  { id: 31, name: 'Climatisation Centralisée', icon_name: 'cloud-lightning', slug: 'clim-cent' },
  { id: 32, name: 'Froid Commercial', icon_name: 'thermometer-snowflake', slug: 'froid-comm' },
  { id: 33, name: 'Ascenseur & Escalier Méca', icon_name: 'arrow-up-down', slug: 'ascenseur' },
  { id: 34, name: 'Domotique & Smart Home', icon_name: 'home', slug: 'domotique' },
  { id: 35, name: 'Piscine & Jacuzzi', icon_name: 'droplets', slug: 'piscine' },
  { id: 36, name: 'Installation Gaz Cuisine', icon_name: 'flame', slug: 'gaz-cuisine' },
  { id: 37, name: 'Échafaudage Pro', icon_name: 'layers', slug: 'echafaudage' },
  { id: 38, name: 'Isolation Thermique', icon_name: 'shield', slug: 'isolation-therm' },
  { id: 39, name: 'Ponçage Parquet', icon_name: 'sparkles', slug: 'poncage-parquet' },
  { id: 40, name: 'Ponçage Marbre', icon_name: 'sparkles', slug: 'poncage-marbre' },
  { id: 41, name: 'Stores & Volets Roulants', icon_name: 'panel-top', slug: 'stores' },
  { id: 42, name: 'Signalétique Enseignes', icon_name: 'info', slug: 'signaletique' },
  { id: 43, name: 'Forage & Puits', icon_name: 'droplets', slug: 'forage' },
  { id: 44, name: 'Mécanique Essence', icon_name: 'car', slug: 'meca-essence' },
  { id: 45, name: 'Mécanique Diesel', icon_name: 'car', slug: 'meca-diesel' },
  { id: 46, name: 'Électricité Automobile', icon_name: 'zap', slug: 'elec-auto' },
  { id: 47, name: 'Tôlerie & Carrosserie', icon_name: 'car', slug: 'tolerie' },
  { id: 48, name: 'Peinture Automobile', icon_name: 'paint-bucket', slug: 'peinture-auto' },
  { id: 49, name: 'Vulcanisation & Pneus', icon_name: 'circle-dot', slug: 'vulcanisation' },
  { id: 50, name: 'Mécanique Moto', icon_name: 'bike', slug: 'meca-moto' },
  { id: 51, name: 'Mécanique Poids Lourds', icon_name: 'truck', slug: 'meca-camion' },
  { id: 52, name: 'Mécanique Engins BTP', icon_name: 'truck', slug: 'meca-engins' },
  { id: 53, name: 'Diagnostic Électronique', icon_name: 'cpu', slug: 'diag-auto' },
  { id: 54, name: 'Lavage & Lustrage', icon_name: 'waves', slug: 'lavage-auto' },
  { id: 55, name: 'Tapisserie Automobile', icon_name: 'armchair', slug: 'tapisserie-auto' },
  { id: 56, name: 'Location Véhicule Privé', icon_name: 'key', slug: 'location-auto' },
  { id: 57, name: 'Chauffeur Privé', icon_name: 'user', slug: 'chauffeur-prive' },
  { id: 58, name: 'Livreur Urbain (Moto)', icon_name: 'package', slug: 'livreur-moto' },
  { id: 59, name: 'Livreur Urbain (Vélo)', icon_name: 'bike', slug: 'livreur-velo' },
  { id: 60, name: 'Déménagement Camion', icon_name: 'truck', slug: 'demenagement-camion' },
  { id: 61, name: 'Transport de Marchandises', icon_name: 'truck', slug: 'transport-marchandises' },
  { id: 62, name: 'Coursier Express', icon_name: 'package', slug: 'coursier' },
  { id: 63, name: 'Réparation Vélo', icon_name: 'bike', slug: 'rep-velo' },
  { id: 64, name: 'Couture Homme Traditionnelle', icon_name: 'scissors', slug: 'couture-homme-trad' },
  { id: 65, name: 'Couture Femme Traditionnelle', icon_name: 'scissors', slug: 'couture-femme-trad' },
  { id: 66, name: 'Couture Prêt-à-porter', icon_name: 'scissors', slug: 'couture-pap' },
  { id: 67, name: 'Stylisme & Modélisme', icon_name: 'palette', slug: 'stylisme' },
  { id: 68, name: 'Bijouterie Or & Argent', icon_name: 'gem', slug: 'bijouterie' },
  { id: 69, name: 'Maroquinerie Sacs', icon_name: 'briefcase', slug: 'maroquinerie-sacs' },
  { id: 70, name: 'Maroquinerie Chaussures', icon_name: 'briefcase', slug: 'maroquinerie-chaussures' },
  { id: 71, name: 'Cordonnerie & Réparation', icon_name: 'footprints', slug: 'cordonnerie' },
  { id: 72, name: 'Tissage de Perruques', icon_name: 'sparkles', slug: 'tissage' },
  { id: 73, name: 'Coiffure Homme (Barbier)', icon_name: 'user', slug: 'coiffure-homme' },
  { id: 74, name: 'Coiffure Femme (Tresses)', icon_name: 'user-round', slug: 'coiffure-femme-tresses' },
  { id: 75, name: 'Coiffure Femme (Chignons)', icon_name: 'user-round', slug: 'coiffure-femme-chignons' },
  { id: 76, name: 'Esthétique & Maquillage', icon_name: 'flower2', slug: 'esthetique' },
  { id: 77, name: 'Soins du Visage', icon_name: 'flower2', slug: 'soins-visage' },
  { id: 78, name: 'Teinture Textile (Thioup)', icon_name: 'palette', slug: 'teinture-thioup' },
  { id: 79, name: 'Batik & Artisanat', icon_name: 'brush', slug: 'batik' },
  { id: 80, name: 'Poterie & Céramique', icon_name: 'flower', slug: 'poterie' },
  { id: 81, name: 'Vannerie & Paniers', icon_name: 'shopping-basket', slug: 'vannerie' },
  { id: 82, name: 'Sculpture Bois Décor', icon_name: 'hammer', slug: 'sculpture-bois' },
  { id: 83, name: 'Sculpture Pierre', icon_name: 'hammer', slug: 'sculpture-pierre' },
  { id: 84, name: 'Tapisserie Ameublement', icon_name: 'armchair', slug: 'tapisserie-ameublement' },
  { id: 85, name: 'Rideaux & Déco Textile', icon_name: 'palette', slug: 'rideaux' },
  { id: 86, name: 'Blanchisserie & Pressing', icon_name: 'waves', slug: 'blanchisserie' },
  { id: 87, name: 'Nettoyage à Sec', icon_name: 'waves', slug: 'nettoyage-sec' },
  { id: 88, name: 'Horlogerie & Montres', icon_name: 'watch', slug: 'horlogerie' },
  { id: 89, name: 'Tatouage & Henné', icon_name: 'pen-tool', slug: 'tatouage-henne' },
  { id: 90, name: 'Manucure & Pédicure', icon_name: 'sparkles', slug: 'manucure' },
  { id: 91, name: 'Boulangerie Traditionnelle', icon_name: 'utensils-crossed', slug: 'boulangerie-trad' },
  { id: 92, name: 'Boulangerie Moderne', icon_name: 'utensils-crossed', slug: 'boulangerie-mod' },
  { id: 93, name: 'Pâtisserie Fine', icon_name: 'cake-slice', slug: 'patisserie-fine' },
  { id: 94, name: 'Traiteur Évènementiel', icon_name: 'chef-hat', slug: 'traiteur-event' },
  { id: 95, name: 'Traiteur Entreprise', icon_name: 'chef-hat', slug: 'traiteur-pro' },
  { id: 96, name: 'Cuisine Locale (Dibiterie)', icon_name: 'utensils', slug: 'dibiterie' },
  { id: 97, name: 'Cuisine Locale (Thieb)', icon_name: 'utensils', slug: 'thieb' },
  { id: 98, name: 'Transformation Fruits', icon_name: 'leaf', slug: 'transfo-fruits' },
  { id: 99, name: 'Transformation Céréales', icon_name: 'wheat', slug: 'transfo-cereales' },
  { id: 100, name: 'Transformation Halieutique', icon_name: 'fish', slug: 'transfo-poisson' },
  { id: 101, name: 'Torréfaction Café', icon_name: 'coffee', slug: 'torrefaction-cafe' },
  { id: 102, name: 'Apiculture & Miel', icon_name: 'beaker', slug: 'apiculture' },
  { id: 103, name: 'Aviculture (Poulets)', icon_name: 'bird', slug: 'aviculture' },
  { id: 104, name: 'Maraîchage Urbain', icon_name: 'leaf', slug: 'maraichage' },
  { id: 105, name: 'Livraison Repas Domicile', icon_name: 'bike', slug: 'livraison-repas' },
  { id: 106, name: 'Jus Locaux & Boissons', icon_name: 'cup-soda', slug: 'jus-locaux' },
  { id: 107, name: 'Boucherie & Découpe', icon_name: 'shrub', slug: 'boucherie' },
  { id: 108, name: 'Glacier & Sorbet', icon_name: 'ice-cream', slug: 'glacier' },
  { id: 109, name: 'Réparation Smartphone', icon_name: 'smartphone', slug: 'rep-phone' },
  { id: 110, name: 'Réparation Tablette', icon_name: 'tablet', slug: 'rep-tablet' },
  { id: 111, name: 'Réparation Laptop', icon_name: 'monitor', slug: 'rep-laptop' },
  { id: 112, name: 'Réparation Console Jeux', icon_name: 'gamepad-2', slug: 'rep-console' },
  { id: 113, name: 'Installation Réseau Wifi', icon_name: 'wifi', slug: 'reseau-wifi' },
  { id: 114, name: 'Maintenance Imprimante', icon_name: 'printer', slug: 'maintenance-imprimante' },
  { id: 115, name: 'Installation CCTV/Vidéo', icon_name: 'video', slug: 'cctv' },
  { id: 116, name: 'Vente Matériel Info', icon_name: 'hard-drive', slug: 'vente-informatique' },
  { id: 117, name: 'Développement Web', icon_name: 'code', slug: 'dev-web' },
  { id: 118, name: 'Développement Mobile', icon_name: 'code-2', slug: 'dev-mobile' },
  { id: 119, name: 'Infographie & Design Logo', icon_name: 'layout', slug: 'infographie' },
  { id: 120, name: 'Community Management', icon_name: 'message-square', slug: 'community-manager' },
  { id: 121, name: 'Photographie Mariage', icon_name: 'camera', slug: 'photo-mariage' },
  { id: 122, name: 'Photographie Studio', icon_name: 'camera', slug: 'photo-studio' },
  { id: 123, name: 'Montage Vidéo Youtube', icon_name: 'video', slug: 'montage-video' },
  { id: 124, name: 'Sonorisation Mariage/Event', icon_name: 'music', slug: 'sonorisation' },
  { id: 125, name: 'Installation Antenne TV', icon_name: 'tv', slug: 'antenne-tv' },
  { id: 126, name: 'Maintenance Éolienne', icon_name: 'fan', slug: 'eolien' },
  { id: 127, name: 'Énergie Biomasse', icon_name: 'flame', slug: 'biomasse' },
  { id: 128, name: 'Réparation Électroménager', icon_name: 'tv', slug: 'rep-electro' },
  { id: 129, name: 'Nettoyage Bureaux', icon_name: 'sparkles', slug: 'nettoyage-bureaux' },
  { id: 130, name: 'Nettoyage Domicile', icon_name: 'sparkles', slug: 'nettoyage-domicile' },
  { id: 131, name: 'Désinfection Nuisibles', icon_name: 'shield-alert', slug: 'desinfection' },
  { id: 132, name: 'Jardinage Résidentiel', icon_name: 'wind', slug: 'jardinage-res' },
  { id: 133, name: 'Paysagisme & Design Jardin', icon_name: 'leaf', slug: 'paysagisme' },
  { id: 134, name: 'Recyclage Plastique', icon_name: 'recycle', slug: 'recyclage-plastique' },
  { id: 135, name: 'Recyclage Métaux', icon_name: 'recycle', slug: 'recyclage-metaux' },
  { id: 136, name: 'Recyclage Électronique', icon_name: 'recycle', slug: 'recyclage-electronique' },
  { id: 137, name: 'Éducation & Répétition', icon_name: 'graduation-cap', slug: 'repetition' },
  { id: 138, name: 'Cours de Langues (Wolof)', icon_name: 'languages', slug: 'cours-wolof' },
  { id: 139, name: 'Formation Informatique', icon_name: 'book-open', slug: 'formation-info' },
  { id: 140, name: 'Assistance Administrative', icon_name: 'file-text', slug: 'assistanat' },
  { id: 141, name: 'Conseil en Marketing', icon_name: 'bar-chart-3', slug: 'conseil-mkt' },
  { id: 142, name: 'Traducteur Français/Wolof', icon_name: 'languages', slug: 'traducteur-wo' },
  { id: 143, name: 'Agent de Sécurité Privé', icon_name: 'shield', slug: 'securite-privee' },
  { id: 144, name: 'Gardiennage Résidence', icon_name: 'eye', slug: 'gardiennage' },
  { id: 145, name: 'Conciergerie Luxe', icon_name: 'bell', slug: 'conciergerie' },
  { id: 146, name: 'Vente en Ligne (WhatsApp)', icon_name: 'shopping-cart', slug: 'ecommerce-wa' },
  { id: 147, name: 'Gestion de Stock', icon_name: 'boxes', slug: 'gestion-stock' },
  { id: 148, name: 'Organisation Voyage', icon_name: 'plane', slug: 'voyage' },
];

export function useDiscovery() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');
        
        if (!error && data && data.length > 0) {
          setCategories(data);
        } else {
          // Use fallback if API fails or returns empty
          console.warn('Using fallback categories - API error:', error);
          setCategories(FALLBACK_CATEGORIES);
        }
      } catch (e) {
        console.warn('Using fallback categories - Exception:', e);
        setCategories(FALLBACK_CATEGORIES);
      }
      setLoading(false);
    };

    fetchCategories();
  }, []);

  const searchArtisans = async (query?: string, categoryId?: number) => {
    setLoading(true);
    let q = supabase
      .from('artisans')
      .select('*, profiles(*)');

    if (categoryId) {
      q = q.eq('category_id', categoryId);
    }

    if (query) {
      q = q.or(`specialty.ilike.%${query}%,bio.ilike.%${query}%,profiles.full_name.ilike.%${query}%`);
    }

    const { data, error } = await q;
    setLoading(false);
    return data as ArtisanProfile[] || [];
  };

  return {
    categories,
    loading,
    searchArtisans,
  };
}
