import React from 'react';
import { Route, Routes, useNavigate, Navigate } from 'react-router-dom';
import { ToastContainer } from './components/Toast';
import { OfflineBanner } from './components/OfflineBanner';
import { ScrollToTop } from './components/ScrollToTop';
import { PageTransition } from './components/PageTransition';
import { InstallPrompt } from './components/InstallPrompt';
import { PWAInstallProvider } from './contexts/PWAInstallContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useToastContext } from './contexts/ToastContext';
import { PrivateRoute } from './components/PrivateRoute';
import { AdminRoute } from './components/AdminRoute';
import { LandingPage } from './pages/LandingPage';
import { OnboardPage } from './pages/OnboardPage';
import { ArtisansPage } from './pages/ArtisansPage';
import { CategoryPage } from './pages/CategoryPage';
import { CreateProjectPage } from './pages/CreateProjectPage';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { MarketplaceProductPage } from './pages/MarketplaceProductPage';
import { MarketplaceCheckoutPage } from './pages/MarketplaceCheckoutPage';
import { CreditsPage } from './pages/CreditsPage';
import { ProjectPaymentPage } from './pages/ProjectPaymentPage';
import { ProjectThankYouPage } from './pages/ProjectThankYouPage';
import { ProjectSuiviPage } from './pages/ProjectSuiviPage';
import { ProjectWorkPage } from './pages/ProjectWorkPage';
import { ProjectAwaitingPaymentPage } from './pages/ProjectAwaitingPaymentPage';
import { ProjectCompletionPage } from './pages/ProjectCompletionPage';
import { ChatPage } from './pages/ChatPage';
import { Dashboard } from './pages/Dashboard';
import { VerificationPage } from './pages/VerificationPage';
import { EditProfilePage } from './pages/EditProfilePage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { ArtisanPublicProfilePage } from './pages/ArtisanPublicProfilePage';
import { FavoritesPage } from './pages/FavoritesPage';
import { AboutPage } from './pages/AboutPage';
import { AidePage } from './pages/AidePage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminProjects } from './pages/admin/AdminProjects';
import { AdminEscrows } from './pages/admin/AdminEscrows';
import { AdminVerifications } from './pages/admin/AdminVerifications';
import { AdminDisputes } from './pages/admin/AdminDisputes';
import { AdminClosures } from './pages/admin/AdminClosures';
import { AdminBoutique } from './pages/admin/AdminBoutique';
import { AdminCommandes } from './pages/admin/AdminCommandes';
import { AdminAffiliations } from './pages/admin/AdminAffiliations';
import { AdminOrganisations } from './pages/admin/AdminOrganisations';
import { AdminExports } from './pages/admin/AdminExports';
import { RevisionsPage } from './pages/RevisionsPage';
import { RequestRevisionPage } from './pages/RequestRevisionPage';
import { RevisionResponsePage } from './pages/RevisionResponsePage';
import { ConversationsPage } from './pages/ConversationsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ChambreDashboardPage } from './pages/ChambreDashboardPage';
import { ChambreMetierRoute } from './components/ChambreMetierRoute';
import { MyProductsPage } from './pages/MyProductsPage';
import { MyCertificationsPage } from './pages/MyCertificationsPage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { MyShopOrdersPage } from './pages/MyShopOrdersPage';
import { PanierPage } from './pages/PanierPage';
import { CompteSuspenduPage } from './pages/CompteSuspenduPage';
import { InvitePage } from './pages/InvitePage';

// Page affichée quand on ouvre /download/... dans l'app (fichier APK non servi)
function DownloadUnavailablePage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl" aria-hidden>📱</span>
        </div>
        <h1 className="text-xl font-black text-gray-900 mb-2">Téléchargement indisponible</h1>
        <p className="text-gray-600 text-sm mb-6">
          Le fichier n'est pas disponible à cette adresse. Revenez à l'accueil et utilisez « Télécharger sur mobile » dans le footer pour installer l'application Mbourake (PWA).
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-colors"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}

// Composant pour page 404 - Route non trouvée
function NotFoundPage() {
  const navigate = useNavigate();

  React.useEffect(() => {
    // Log pour debug
    console.warn('404 - Route non trouvée:', window.location.pathname);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="w-24 h-24 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl font-black text-brand-600">404</span>
          </div>
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Page non trouvée</h1>
        <p className="text-gray-600 mb-8">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-brand-500 text-white rounded-xl font-bold hover:bg-brand-600 transition-colors"
          >
            Retour à l'accueil
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
          >
            Page précédente
          </button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { toasts, removeToast } = useToastContext();
  
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <PageTransition />
      <OfflineBanner />
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/aide" element={<AidePage />} />
      <Route path="/onboard" element={<OnboardPage />} />
      <Route path="/artisans" element={<ArtisansPage />} />
      <Route path="/artisans/:id" element={<ArtisanPublicProfilePage />} />
      <Route path="/favorites" element={<FavoritesPage />} />
      <Route path="/category/:slug" element={<CategoryPage />} />
      <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="/marketplace/:productId" element={<MarketplaceProductPage />} />
      <Route path="/marketplace/:productId/checkout" element={<PrivateRoute><MarketplaceCheckoutPage /></PrivateRoute>} />
      <Route path="/download/:filename" element={<DownloadUnavailablePage />} />
      <Route path="/compte-suspendu" element={<CompteSuspenduPage />} />
      <Route path="/invite/:token" element={<InvitePage />} />
      
      {/* Redirection URL courante vers l’admin (évite 404 sur /dashboard/ADMIN) */}
      <Route path="/dashboard/ADMIN" element={<Navigate to="/admin" replace />} />
      {/* Protected Routes */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/revisions" element={<PrivateRoute><RevisionsPage /></PrivateRoute>} />
      <Route path="/revisions/:revisionId/respond" element={<PrivateRoute><RevisionResponsePage /></PrivateRoute>} />
      <Route path="/create-project" element={<PrivateRoute><CreateProjectPage /></PrivateRoute>} />
      <Route path="/projects/:id" element={<PrivateRoute><ProjectDetailsPage /></PrivateRoute>} />
      <Route path="/projects/:projectId/request-revision" element={<PrivateRoute><RequestRevisionPage /></PrivateRoute>} />
      <Route path="/projects/:id/payment" element={<PrivateRoute><ProjectPaymentPage /></PrivateRoute>} />
      <Route path="/projects/:id/thank-you" element={<PrivateRoute><ProjectThankYouPage /></PrivateRoute>} />
      <Route path="/projects/:id/suivi" element={<PrivateRoute><ProjectSuiviPage /></PrivateRoute>} />
      <Route path="/projects/:id/work" element={<PrivateRoute><ProjectWorkPage /></PrivateRoute>} />
      <Route path="/projects/:id/awaiting-payment" element={<PrivateRoute><ProjectAwaitingPaymentPage /></PrivateRoute>} />
      <Route path="/projects/:id/completion" element={<PrivateRoute><ProjectCompletionPage /></PrivateRoute>} />
      <Route path="/chat/:projectId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/credits" element={<PrivateRoute><CreditsPage /></PrivateRoute>} />
      <Route path="/verification" element={<PrivateRoute><VerificationPage /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      <Route path="/edit-profile" element={<PrivateRoute><EditProfilePage /></PrivateRoute>} />
      <Route path="/expenses" element={<PrivateRoute><ExpensesPage /></PrivateRoute>} />
      <Route path="/invoices" element={<PrivateRoute><InvoicesPage /></PrivateRoute>} />
      <Route path="/conversations" element={<PrivateRoute><ConversationsPage /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
      {/* Tableau de bord Chambre de Métiers */}
      <Route
        path="/chambre"
        element={
          <ChambreMetierRoute>
            <ChambreDashboardPage />
          </ChambreMetierRoute>
        }
      />
      <Route path="/my-products" element={<PrivateRoute><MyProductsPage /></PrivateRoute>} />
      <Route path="/my-certifications" element={<PrivateRoute><MyCertificationsPage /></PrivateRoute>} />
      <Route path="/my-orders" element={<PrivateRoute><MyOrdersPage /></PrivateRoute>} />
      <Route path="/my-shop-orders" element={<PrivateRoute><MyShopOrdersPage /></PrivateRoute>} />
      <Route path="/panier" element={<PrivateRoute><PanierPage /></PrivateRoute>} />
      
      {/* Admin Routes (layout commun avec sidebar) */}
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>}>
        <Route path="users" element={<AdminUsers />} />
        <Route path="projects" element={<AdminProjects />} />
        <Route path="boutique" element={<AdminBoutique />} />
        <Route path="commandes" element={<AdminCommandes />} />
        <Route path="escrows" element={<AdminEscrows />} />
        <Route path="verifications" element={<AdminVerifications />} />
        <Route path="affiliations" element={<AdminAffiliations />} />
        <Route path="organisations" element={<AdminOrganisations />} />
        <Route path="exports" element={<AdminExports />} />
        <Route path="disputes" element={<AdminDisputes />} />
        <Route path="closures" element={<AdminClosures />} />
      </Route>
      
      {/* Route catch-all pour les routes non trouvées - DOIT ÊTRE EN DERNIER */}
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <InstallPrompt />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <PWAInstallProvider>
      <AppContent />
    </PWAInstallProvider>
  );
}
