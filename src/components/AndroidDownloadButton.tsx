import React, { useState } from 'react';
import { Smartphone, Download, X } from 'lucide-react';

const APK_URL = import.meta.env.VITE_ANDROID_APK_URL || '/download/mbourake.apk';

export function AndroidDownloadButton({ variant = 'nav' }: { variant?: 'nav' | 'footer' }) {
  const [open, setOpen] = useState(false);
  const hasApkUrl = !!(import.meta.env.VITE_ANDROID_APK_URL?.trim()) || true;

  const buttonClass =
    variant === 'nav'
      ? 'flex items-center gap-2 text-gray-600 hover:text-brand-500 font-semibold text-sm transition-all duration-200'
      : 'flex items-center gap-2 text-gray-600 hover:text-brand-500 font-bold text-sm transition-colors';

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass}>
        <Smartphone size={variant === 'nav' ? 18 : 20} className="shrink-0" />
        <span className="hidden sm:inline">Télécharger l'app Android</span>
        <span className="sm:hidden">App Android</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          role="presentation"
        >
          {/* Modal centré au milieu de l'écran (position fixe) */}
          <div
            className="fixed left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-md max-h-[85vh] -translate-x-1/2 -translate-y-1/2 flex flex-col rounded-2xl bg-white shadow-2xl overflow-hidden"
            style={{ maxHeight: '85vh' }}
            role="dialog"
            aria-labelledby="download-app-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            {/* En-tête */}
            <div className="flex items-start justify-between gap-3 p-5 shrink-0 border-b border-gray-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-brand-100 flex items-center justify-center shrink-0">
                  <Smartphone size={24} className="text-brand-600" />
                </div>
                <h2 id="download-app-title" className="text-base md:text-lg font-black text-gray-900">
                  App Mbourake pour Android
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0"
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Contenu scrollable */}
            <div className="p-5 overflow-y-auto flex-1 min-h-0">
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Téléchargez l'application et installez-la sur votre téléphone Android. Vous pourrez utiliser Mbourake comme une app, sans passer par le Play Store.
              </p>
              <p className="text-gray-500 text-xs leading-relaxed mb-4">
                Après le téléchargement, ouvrez le fichier et acceptez l'installation si votre appareil vous demande d'autoriser les « sources inconnues ».
              </p>
              <div className="flex flex-col gap-3">
                {hasApkUrl ? (
                  <>
                    <a
                      href={APK_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      download="mbourake.apk"
                      className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-brand-500 text-white rounded-xl font-bold text-sm shadow-md hover:bg-brand-600 transition-colors no-underline"
                      onClick={() => setOpen(false)}
                    >
                      <Download size={20} />
                      Télécharger l'APK
                    </a>
                    <p className="text-gray-400 text-xs text-center">
                      Si le lien ne fonctionne pas, l'APK n'est pas encore disponible. Réessayez plus tard.
                    </p>
                  </>
                ) : (
                  <span className="flex items-center justify-center gap-2 w-full py-3.5 px-4 bg-gray-200 text-gray-500 rounded-xl font-medium text-sm">
                    Bientôt disponible
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="py-2.5 text-gray-500 hover:text-gray-700 font-medium text-sm transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
