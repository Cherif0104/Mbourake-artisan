/**
 * Hiérarchie des z-index pour éviter les conflits entre overlays.
 * Règle : loading > install prompt > modales > page.
 */
export const Z_INDEX = {
  /** Modales (confirmations, dialogs) */
  MODAL: 50,
  /** Bandeau d'installation PWA (au-dessus des modales) */
  INSTALL_PROMPT: 100,
  /** Overlay de chargement / transition (toujours au-dessus) */
  LOADING: 9999,
} as const;
