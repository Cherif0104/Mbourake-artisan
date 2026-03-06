import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, AlertTriangle, MessageCircle, FileText, ShoppingBag } from 'lucide-react';

export function AidePage() {
  const navigate = useNavigate();

  const handleWhatsApp = () => {
    window.open('https://wa.me/221788324069', '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="Retour"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-black text-gray-900">Aide et support</h1>
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-brand-50 rounded-xl transition-colors"
            title="Accueil"
          >
            <Home size={20} className="text-gray-600" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-8">
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={24} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-2">Signaler un litige</h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                En cas de différend avec un artisan ou un client sur un projet (qualité, délai, montant), vous pouvez signaler un litige directement depuis la page du projet concerné.
              </p>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                Cliquez sur le bouton <strong>« Signaler un litige »</strong> sur la page de détail du projet. L&apos;équipe Mbouraké prend alors le projet en charge et contacte les deux parties pour trouver une solution équitable.
              </p>
              <p className="text-gray-600 text-sm text-sm">
                Les fonds éventuellement déposés en séquestre restent bloqués jusqu&apos;à la résolution du litige.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
              <MessageCircle size={24} className="text-brand-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-2">Nous contacter</h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Pour toute question générale, problème technique ou demande d&apos;information, vous pouvez nous joindre par WhatsApp.
              </p>
              <button
                type="button"
                onClick={handleWhatsApp}
                className="inline-flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-colors"
              >
                <MessageCircle size={20} />
                Contacter par WhatsApp
              </button>
            </div>
          </div>
        </section>

        <section className="bg-gray-50 rounded-2xl border border-gray-100 p-6">
          <h2 className="text-base font-black text-gray-900 mb-3">En savoir plus</h2>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => navigate('/about')}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 text-left font-medium text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <FileText size={20} className="text-brand-500" />
              À propos de Mbouraké
            </button>
            <button
              type="button"
              onClick={() => navigate('/onboard?mode=login&role=client&redirect=' + encodeURIComponent('/create-project'))}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 text-left font-medium text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <FileText size={20} className="text-brand-500" />
              Créer un projet
            </button>
            <button
              type="button"
              onClick={() => navigate('/marketplace')}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 text-left font-medium text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <ShoppingBag size={20} className="text-brand-500" />
              Explorer la marketplace
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
