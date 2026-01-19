import React, { useState, useEffect } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabase';

const LANGUAGE_STORAGE_KEY = 'mbourake_language';
const DEFAULT_LANGUAGE = 'fr';

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'wo', label: 'Wolof', flag: '🇸🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

export function LanguageSelector() {
  const auth = useAuth();
  const { profile } = useProfile();
  const [currentLang, setCurrentLang] = useState<string>(DEFAULT_LANGUAGE);
  const [isOpen, setIsOpen] = useState(false);

  // Charger la langue depuis localStorage ou profil
  useEffect(() => {
    const storedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY) || DEFAULT_LANGUAGE;
    setCurrentLang(storedLang);
  }, []);

  // Synchroniser avec le profil si connecté
  useEffect(() => {
    if (profile?.preferred_language) {
      const lang = profile.preferred_language as string;
      setCurrentLang(lang);
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    }
  }, [profile?.preferred_language]);

  const handleLanguageChange = async (langCode: string) => {
    setCurrentLang(langCode);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, langCode);
    setIsOpen(false);

    // Sauvegarder dans le profil si connecté
    if (auth.user) {
      try {
        await supabase
          .from('profiles')
          .update({ preferred_language: langCode } as any)
          .eq('id', auth.user.id);
      } catch (err) {
        console.error('Erreur lors de la sauvegarde de la langue:', err);
      }
    }
  };

  const selectedLanguage = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-all text-sm font-medium text-gray-700"
        aria-label="Sélectionner la langue"
      >
        <Globe size={16} className="text-gray-500" />
        <span className="text-base">{selectedLanguage.flag}</span>
        <ChevronDown 
          size={14} 
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen ? (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 top-full mt-2 bg-white rounded-xl border-2 border-gray-100 shadow-2xl overflow-hidden z-50 min-w-[180px]">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-brand-50 transition-colors ${
                  currentLang === lang.code ? 'bg-brand-50 text-brand-600' : 'text-gray-700'
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="font-medium">{lang.label}</span>
                {currentLang === lang.code && (
                  <div className="ml-auto w-2 h-2 bg-brand-500 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
