import { useEffect, useRef } from 'react';

/**
 * Hook pour empêcher la navigation/refresh pendant qu'une action est en cours
 * Affiche un avertissement si l'utilisateur essaie de quitter la page
 */
export function usePreventNavigation(isBlocking: boolean, message?: string) {
  const messageRef = useRef(message);

  // Mettre à jour le message si nécessaire
  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  useEffect(() => {
    if (!isBlocking) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Message personnalisé (la plupart des navigateurs l'ignorent mais certains l'affichent)
      const customMessage = messageRef.current || 'Vous avez une soumission en cours. Êtes-vous sûr de vouloir quitter cette page ?';
      e.preventDefault();
      // Standard pour la plupart des navigateurs modernes
      e.returnValue = customMessage;
      return customMessage;
    };

    // Intercepter les rafraîchissements et les fermetures de page
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isBlocking]);

  // Retourner une fonction pour nettoyer manuellement si nécessaire
  return {
    isBlocking,
  };
}
