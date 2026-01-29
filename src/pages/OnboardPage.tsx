import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, Loader2, User as UserIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { ProfileRole } from '../hooks/useProfile';
import { LanguageSelector } from '../components/LanguageSelector';

// Simple Google logo SVG used in the auth button
const GoogleLogo: React.FC = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

type AuthMode = 'signup' | 'login';
type OnboardStep = 'role' | 'auth';

export function OnboardPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [searchParams] = useSearchParams();

  // Déterminer le mode (inscription ou connexion)
  const urlMode = searchParams.get('mode');
  const authMode: AuthMode = urlMode === 'login' || urlMode === 'signup' ? (urlMode as AuthMode) : 'signup';

  // En mode login : on saute directement à l'étape d'authentification
  const [currentStep, setCurrentStep] = useState<OnboardStep>(
    authMode === 'login' ? 'auth' : 'role',
  );
  const [role, setRole] = useState<ProfileRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pré-remplir le rôle depuis l'URL pour des liens du type ?role=client|artisan (signup uniquement)
  useEffect(() => {
    const roleFromUrl = searchParams.get('role') as ProfileRole | null;
    if (authMode === 'signup' && (roleFromUrl === 'client' || roleFromUrl === 'artisan')) {
      setRole(roleFromUrl);
      setCurrentStep('auth');
    }
  }, [searchParams, authMode]);

  const handleBack = () => {
    navigate('/', { replace: true });
  };

  const handleRoleSelect = (selectedRole: ProfileRole) => {
    if (authMode === 'login') {
      // En mode login, on ne devrait normalement pas passer par ici,
      // mais par sécurité on ignore la sélection de rôle.
      setCurrentStep('auth');
      return;
    }

    setRole(selectedRole);
    setCurrentStep('auth');
    // On garde le rôle dans l'URL pour que le redirect OAuth puisse le réutiliser
    const params = new URLSearchParams();
    params.set('mode', authMode);
    params.set('role', selectedRole);
    navigate(`/onboard?${params.toString()}`, { replace: true });
  };

  const handleGoogleAuth = async () => {
    // En signup, on exige un rôle choisi pour pouvoir le transmettre à l'OAuth
    if (authMode === 'signup' && !role) {
      setError("Merci de choisir d'abord Client ou Artisan.");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      // Mémoriser le rôle dans localStorage pour le récupérer après OAuth
      // (car l'URL de retour peut ne pas contenir les query params)
      if (authMode === 'signup' && role) {
        localStorage.setItem('mbourake_pending_role', role);
        localStorage.setItem('mbourake_pending_mode', authMode);
      }

      // En login, on ne transmet pas de rôle (déjà enregistré côté profil)
      const roleToSend = authMode === 'signup' ? role || undefined : undefined;
      await auth.signInWithGoogle(authMode, roleToSend);
      // signInWithGoogle redirige vers /dashboard après OAuth
    } catch (e: any) {
      setError(e?.message ?? "Impossible de démarrer la connexion avec Google");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFCFB] via-white to-orange-50/30 flex flex-col">
      {/* Header avec bouton retour et sélection de langue */}
      <header className="px-6 py-4 bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-500 hover:text-brand-600 font-bold text-sm transition-colors"
          >
            <ArrowLeft size={18} />
            Retour
          </button>
          <LanguageSelector />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">
          {/* Étape 1 : choix du rôle (uniquement en mode signup) */}
          {currentStep === 'role' && authMode === 'signup' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb  -8">
                <h1 className="text-3xl font-black text-gray-900 mb-2">Vous êtes...</h1>
                <p className="text-gray-500">Choisissez votre profil</p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => handleRoleSelect('client')}
                  className="w-full rounded-3xl border-2 border-gray-100 p-6 text-left transition-all hover:scale-[1.02] active:scale-[0.98] hover:border-brand-200 hover:shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-brand-500 text-white">
                      <UserIcon size={32} />
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-lg text-gray-900">Je suis Client</div>
                      <div className="text-sm text-gray-500">Je cherche un artisan pour mon projet</div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleRoleSelect('artisan')}
                  className="w-full rounded-3xl border-2 border-gray-100 p-6 text-left transition-all hover:scale-[1.02] active:scale-[0.98] hover:border-brand-200 hover:shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-brand-500 text-white">
                      <Briefcase size={32} />
                    </div>
                    <div className="flex-1">
                      <div className="font-black text-lg text-gray-900">Je suis Artisan</div>
                      <div className="text-sm text-gray-500">Je propose mes services et mon savoir-faire</div>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Étape 2 : authentification Google */}
          {currentStep === 'auth' && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-black text-gray-900 mb-2">
                  {authMode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
                </h1>
                <p className="text-gray-500">
                  {authMode === 'signup'
                    ? "Choisissez votre méthode d'authentification"
                    : 'Connectez-vous à votre compte'}
                </p>
              </div>

              <div className="space-y-6">
                <button
                  onClick={handleGoogleAuth}
                  disabled={loading || (authMode === 'signup' && !role)}
                  type="button"
                  className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 rounded-2xl py-4 font-bold text-gray-700 hover:border-gray-200 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <GoogleLogo />
                  {loading
                    ? 'Redirection vers Google...'
                    : authMode === 'signup'
                    ? "S'inscrire avec Google"
                    : 'Se connecter avec Google'}
                </button>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 font-medium">
                    {error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fallback de sécurité */}
          {currentStep !== 'role' && currentStep !== 'auth' && (
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Chargement...</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

