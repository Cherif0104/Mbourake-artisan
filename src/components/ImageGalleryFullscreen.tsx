import React, { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageGalleryFullscreenProps {
  images: string[];
  initialIndex?: number;
  onClose: () => void;
  title?: string;
}

/**
 * Galerie plein écran : swipe gauche/droite, scroll, fermeture.
 * Reste dans la plateforme (pas de navigation).
 */
export function ImageGalleryFullscreen({
  images,
  initialIndex = 0,
  onClose,
  title,
}: ImageGalleryFullscreenProps) {
  const [index, setIndex] = React.useState(initialIndex);
  const touchStartX = React.useRef<number>(0);
  const touchEndX = React.useRef<number>(0);

  const currentImage = images[index] ?? null;
  const hasMultiple = images.length > 1;
  const canGoPrev = index > 0;
  const canGoNext = index < images.length - 1;

  const goPrev = useCallback(() => {
    setIndex((i) => (i <= 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i >= images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goPrev, goNext]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndX.current = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  if (images.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Galerie photos plein écran"
    >
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
        {title && (
          <span className="text-white font-semibold text-sm truncate max-w-[60%]">{title}</span>
        )}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="Fermer"
        >
          <X size={24} />
        </button>
      </header>

      {/* Zone image scrollable */}
      <main
        className="flex-1 flex items-center justify-center overflow-auto overscroll-contain min-h-0"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt={title ? `${title} - Photo ${index + 1}` : `Photo ${index + 1}`}
            className="max-w-full max-h-full w-auto h-auto object-contain select-none"
            draggable={false}
            style={{ touchAction: 'pan-y' }}
          />
        ) : null}
      </main>

      {/* Navigation + indicateurs */}
      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            aria-label="Photo précédente"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            aria-label="Photo suivante"
          >
            <ChevronRight size={28} />
          </button>
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === index ? 'bg-white' : 'bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Photo ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
