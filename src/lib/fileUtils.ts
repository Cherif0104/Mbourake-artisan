/**
 * Nettoie un nom de fichier pour le rendre compatible avec Supabase Storage
 * Remplace les caractères spéciaux et les espaces par des caractères sûrs
 */
export function sanitizeFileName(fileName: string): string {
  // Extraire l'extension du fichier
  const lastDotIndex = fileName.lastIndexOf('.');
  const name = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex).toLowerCase() : '';
  
  // Nettoyer le nom : remplacer les caractères spéciaux par des underscores
  // Garder uniquement lettres, chiffres, underscores, tirets et points
  let sanitized = name
    // Normaliser les accents (é -> e, à -> a, etc.)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remplacer TOUS les caractères spéciaux (espaces, &, (), ', etc.) par des underscores
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    // Remplacer les underscores multiples par un seul
    .replace(/_+/g, '_')
    // Enlever les underscores au début et à la fin
    .replace(/^_+|_+$/g, '')
    // Limiter la longueur (max 150 caractères pour le nom pour éviter de dépasser 255 avec le chemin)
    .substring(0, 150);
  
  // Si le nom est vide après nettoyage, utiliser un nom par défaut
  if (!sanitized) {
    sanitized = 'file';
  }
  
  // Si le nom final est trop court, ajouter un identifiant
  if (sanitized.length < 3) {
    sanitized = sanitized + '_' + Math.random().toString(36).substring(2, 6);
  }
  
  return sanitized + extension;
}

/**
 * Génère un nom de fichier sécurisé avec timestamp pour éviter les conflits
 */
export function generateSafeFileName(originalName: string, prefix?: string): string {
  const sanitized = sanitizeFileName(originalName);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  
  if (prefix) {
    return `${prefix}-${timestamp}-${random}-${sanitized}`;
  }
  
  return `${timestamp}-${random}-${sanitized}`;
}
