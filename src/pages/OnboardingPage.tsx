import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, MapPin, ShieldCheck, Phone, Globe, ChevronRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';

export function OnboardingPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const [step, setStep] = useState(1);
  const [lang, setLang] = useState('fr');

  // Vérifier si utilisateur connecté et profil complet - éviter les boucles
  useEffect(() => {
    if (auth.loading || profileLoading) return;
    
    // Si utilisateur connecté avec profil complet -> rediriger vers dashboard
    if (auth.user && profile) {
      const isProfileComplete = profile.role && profile.full_name && profile.location && 
        (profile.role !== 'artisan' || profile.category_id);
      
      if (isProfileComplete) {
        navigate('/dashboard', { replace: true });
        return;
      }
    }
    
    // Si utilisateur connecté mais profil incomplet -> rediriger vers profile-setup
    if (auth.user && !profileLoading && (!profile || !profile.role)) {
      navigate('/profile-setup', { replace: true });
      return;
    }
  }, [auth.user, auth.loading, profile, profileLoading, navigate]);

  const chambresMetiers = [
    { region: 'Dakar', adresse: 'Avenue Malick Sy x Rue 6, Dakar', tel: '+221 33 822 28 40' },
    { region: 'Thiès', adresse: 'Quartier Escale, Thiès', tel: '+221 33 951 11 58' },
    { region: 'Saint-Louis', adresse: 'Quartier Nord, Saint-Louis', tel: '+221 33 961 12 10' },
    { region: 'Diourbel', adresse: 'Route de Gossas, Diourbel', tel: '+221 33 971 10 45' },
    { region: 'Kaolack', adresse: 'Quartier Kasnack, Kaolack', tel: '+221 33 941 12 30' },
    { region: 'Ziguinchor', adresse: 'Boulevard de 50m, Ziguinchor', tel: '+221 33 991 14 20' },
    { region: 'Louga', adresse: 'Quartier Artillerie, Louga', tel: '+221 33 967 11 05' },
    { region: 'Fatick', adresse: 'Quartier Escale, Fatick', tel: '+221 33 949 10 15' },
    { region: 'Kolda', adresse: 'Quartier Doumassou, Kolda', tel: '+221 33 996 11 40' },
    { region: 'Matam', adresse: 'Quartier Soubalo, Matam', tel: '+221 33 966 10 08' },
    { region: 'Kaffrine', adresse: 'Centre-ville, Kaffrine', tel: '+221 33 946 10 10' },
    { region: 'Kédougou', adresse: 'Quartier Dandé Mayo, Kédougou', tel: '+221 33 981 10 05' },
    { region: 'Sédhiou', adresse: 'Quartier Moricounda, Sédhiou', tel: '+221 33 995 10 02' },
    { region: 'Tambacounda', adresse: 'Quartier Liberté, Tambacounda', tel: '+221 33 981 11 20' }
  ];

  const translations = {
    fr: { title: "Bienvenue sur Mbouraké", sub: "Le mélange parfait pour valoriser l'artisanat.", langTitle: "Parlez votre langue", langSub: "Choisissez votre langue pour une expérience personnalisée.", next: "Suivant", start: "Lancer l'expérience", regionTitle: "Nos Centres Partenaires", regionSub: "Contactez la Chambre de Métiers de votre région pour votre certification." },
    wo: { title: "Dalal jàmm ci Mbouraké", sub: "Mélange bu mat sëkk ngir féssal xarañté.", langTitle: "Lakk wi nga bëgg", langSub: "Tannal sa lakk ngir gëna yombal liguéy bi.", next: "Kaname", start: "Door ko", regionTitle: "Sunu bërëb yi", regionSub: "Jokko lene ak Chambre de Métiers yu sunu gox yi." }
  };

  const t = translations[lang as keyof typeof translations] || translations.fr;

  return (
    <div 
      className="min-h-screen bg-cover bg-center flex items-center justify-center p-4 relative font-sans"
      style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?auto=format&fit=crop&q=80")' }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      
      <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-8 md:p-12 flex flex-col items-center animate-in zoom-in duration-500">
        {step === 1 ? (
          <div className="w-full text-center">
            <div className="mb-10">
              <span className="text-4xl font-black text-gray-900 tracking-tighter italic">Mboura <span className="text-brand-500">ké</span></span>
            </div>
            
            <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-500 mx-auto mb-6 shadow-sm">
              <Globe size={32} strokeWidth={2.5} />
            </div>

            <h1 className="text-3xl font-black text-gray-900 mb-4">{t.langTitle}</h1>
            <p className="text-gray-500 mb-10 leading-relaxed font-medium">{t.langSub}</p>

            <div className="flex flex-col gap-3 mb-12">
              {['Wolof', 'Français', 'English'].map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l.toLowerCase().slice(0,2) === 'wo' ? 'wo' : l.toLowerCase().slice(0,2) === 'en' ? 'en' : 'fr')}
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest border-2 transition-all ${
                    (l === 'Wolof' && lang === 'wo') || (l === 'Français' && lang === 'fr') || (l === 'English' && lang === 'en')
                    ? 'border-brand-500 bg-brand-50 text-brand-600 ring-4 ring-brand-100'
                    : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-brand-200'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setStep(2)}
              className="w-full py-5 bg-brand-500 text-white font-black rounded-2xl shadow-xl shadow-brand-100 hover:bg-brand-600 active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
            >
              {t.next}
            </button>
          </div>
        ) : (
          <div className="w-full">
            <div className="flex flex-col items-center text-center mb-10">
              <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center text-brand-500 mb-6 shadow-sm">
                <ShieldCheck size={32} strokeWidth={2.5} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-3">{t.regionTitle}</h1>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">{t.regionSub}</p>
            </div>

            <div className="w-full space-y-3 mb-10 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
              {chambresMetiers.map((item) => (
                <div key={item.region} className="group border-2 border-gray-50 rounded-2xl p-5 hover:border-brand-200 transition-all bg-gray-50/50">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-xl text-brand-500 shadow-sm">
                      <MapPin size={20} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-gray-900 text-base mb-1">CM de {item.region}</h3>
                      <p className="text-xs text-gray-500 font-bold mb-3 opacity-70 leading-snug">{item.adresse}</p>
                      <a href={`tel:${item.tel.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 text-brand-600 font-black text-xs hover:underline">
                        <Phone size={14} fill="currentColor" />
                        {item.tel}
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 py-5 bg-gray-100 text-gray-600 font-black rounded-2xl uppercase tracking-widest text-xs active:scale-[0.98] transition-all">Précédent</button>
              <button 
                onClick={() => navigate('/landing')}
                className="flex-[2] py-5 bg-brand-500 text-white font-black rounded-2xl shadow-xl shadow-brand-100 hover:bg-brand-600 active:scale-[0.98] transition-all uppercase tracking-widest text-xs"
              >
                {t.start}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
