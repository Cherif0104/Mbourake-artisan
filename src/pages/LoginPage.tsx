import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, ArrowRight, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';

type AuthMode = 'login' | 'signup';

// Logo Google officiel
const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" width="20" height="20">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export function LoginPage() {
  const auth = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Lire le paramètre 'mode' de l'URL, sinon par défaut 'signup'
  const urlMode = searchParams.get('mode');
  const [mode, setMode] = useState<AuthMode>(
    urlMode === 'login' ? 'login' : 'signup'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  const wantsArtisan = searchParams.get('role') === 'artisan';

  // Synchroniser le mode avec l'URL quand elle change
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'login' || urlMode === 'signup') {
      setMode(urlMode);
    }
  }, [searchParams]);

  // Vérification initiale de l'authentification - redirige si déjà connecté
  useEffect(() => {
    // Attendre que auth ait fini de charger
    if (auth.loading) return;

    // Si non connecté, arrêter la vérification et montrer le formulaire
    if (!auth.user) {
      setIsCheckingAuth(false);
      return;
    }

    // Utilisateur connecté - attendre le profil
    if (profileLoading) return;
    
    // Récupérer le mode depuis l'URL
    const urlMode = searchParams.get('mode');
    
    if (urlMode === 'login') {
      // Mode CONNEXION : l'utilisateur veut se connecter à un compte existant
      if (profile && profile.role) {
        // Profil complet -> Dashboard
        navigate('/dashboard', { replace: true });
      } else {
        // Pas de profil complet -> L'utilisateur existe dans Supabase mais n'a pas terminé son inscription
        // Au lieu de déconnecter, on le redirige vers la configuration du profil
        setSuccess('Votre compte existe mais n\'est pas encore configuré. Complétons votre inscription !');
        
        // Redirection automatique vers la page de configuration après 2 secondes
        setTimeout(() => {
          navigate(`/profile-setup${wantsArtisan ? '?role=artisan' : ''}`, { replace: true });
        }, 2000);
      }
    } else {
      // Mode INSCRIPTION : l'utilisateur veut créer un compte
      if (profile && profile.role) {
        // Déjà un profil complet -> Dashboard (compte existant)
        navigate('/dashboard', { replace: true });
      } else {
        // Pas de profil -> Configuration du profil (choix du rôle, etc.)
        navigate(`/profile-setup${wantsArtisan ? '?role=artisan' : ''}`, { replace: true });
      }
    }
  }, [auth.user, auth.loading, profile, profileLoading, navigate, wantsArtisan, searchParams]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await auth.signInWithGoogle(mode); // Transmet le mode (login ou signup)
    } catch (e: any) {
      setError(e?.message ?? 'Erreur de connexion');
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await auth.signInWithPassword(email, password);
    } catch (e: any) {
      setError(e?.message ?? 'Email ou mot de passe incorrect');
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    try {
      await auth.signUpWithPassword(email, password);
      setSuccess('Inscription réussie ! Vérifiez votre email pour confirmer votre compte.');
      setLoading(false);
    } catch (e: any) {
      setError(e?.message ?? 'Erreur lors de l\'inscription');
      setLoading(false);
    }
  };

  // Écran de chargement pendant la vérification initiale
  if (auth.loading || isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#FDFCFB] via-white to-orange-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Vérification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDFCFB] via-white to-orange-50/30 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4">
        <button 
          onClick={() => navigate('/landing')}
          className="flex items-center gap-2 text-gray-500 hover:text-brand-600 font-bold text-sm transition-colors"
        >
          <ArrowLeft size={18} />
            Retour
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-8 pb-20">
        <div className="w-full max-w-sm">
          {/* Tab Switcher */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-4">
            <button
              onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                mode === 'signup' 
                  ? 'bg-white text-brand-600 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Inscription
            </button>
            <button
              onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
                mode === 'login' 
                  ? 'bg-brand-500 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Connexion
            </button>
          </div>

          {/* Message contextuel */}
          <p className="text-center text-sm text-gray-500 mb-6">
            {mode === 'login' 
              ? 'Connectez-vous à votre compte existant' 
              : 'Créez votre compte et choisissez votre rôle'}
          </p>

          {/* Content */}
          <div className="space-y-6">
            {/* Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-100 rounded-2xl py-4 font-bold text-gray-700 hover:border-gray-200 hover:shadow-md transition-all disabled:opacity-50"
          >
              <GoogleLogo />
              {mode === 'signup' ? "S'inscrire avec Google" : "Se connecter avec Google"}
          </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs font-bold text-gray-400 uppercase">OU</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Email Form */}
            <form onSubmit={mode === 'login' ? handleEmailLogin : handleEmailSignup} className="space-y-4">
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                  placeholder="Votre adresse email"
                required
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-brand-500 focus:bg-white focus:outline-none transition-all font-medium"
              />
            </div>

              <div className="relative">
                <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                  type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  required
                  className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-brand-500 focus:bg-white focus:outline-none transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Afficher le mot de passe"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {mode === 'signup' && (
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmez le mot de passe"
                required
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:border-brand-500 focus:bg-white focus:outline-none transition-all font-medium"
              />
            </div>
              )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 font-medium">
                {error}
              </div>
            )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-600 font-medium">
                  {success}
                </div>
              )}

            <button
              type="submit"
              disabled={loading}
                className="w-full bg-brand-500 text-white rounded-2xl py-4 font-bold flex items-center justify-center gap-2 hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-50"
            >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
                    <ArrowRight size={18} />
                  </>
                )}
            </button>
          </form>

            {/* Switch Mode Link */}
            <p className="text-center text-sm text-gray-500">
              {mode === 'signup' ? (
                <>
                  Déjà un compte ?{' '}
                  <button 
                    onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                    className="text-brand-600 font-bold hover:underline"
                  >
                    Se connecter
                  </button>
                </>
              ) : (
                <>
                  Pas encore de compte ?{' '}
                  <button 
                    onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                    className="text-brand-600 font-bold hover:underline"
                  >
                    S'inscrire
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center">
        <p className="text-xs text-gray-400">
          En continuant, vous acceptez nos{' '}
          <a href="#" className="text-brand-500 hover:underline">CGU</a>
          {' '}et notre{' '}
          <a href="#" className="text-brand-500 hover:underline">Politique de confidentialité</a>
        </p>
      </footer>
    </div>
  );
}
