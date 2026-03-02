import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function CompteSuspenduPage() {
  const navigate = useNavigate();
  const auth = useAuth();

  const handleSignOut = async () => {
    await auth.signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} className="text-amber-600" />
        </div>
        <h1 className="text-xl font-black text-gray-900 mb-2">Compte suspendu</h1>
        <p className="text-gray-600 text-sm mb-6">
          Votre compte a été temporairement suspendu. Pour toute question, contactez le support.
        </p>
        {auth.user && (
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-colors"
          >
            <LogOut size={18} />
            Se déconnecter
          </button>
        )}
        {!auth.user && (
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm hover:bg-brand-600 transition-colors"
          >
            Retour à l&apos;accueil
          </button>
        )}
      </div>
    </div>
  );
}
