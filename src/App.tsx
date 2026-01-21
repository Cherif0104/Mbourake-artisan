import React from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import { ToastContainer } from './components/Toast';
import { OfflineBanner } from './components/OfflineBanner';
import { ScrollToTop } from './components/ScrollToTop';
import { PageTransition } from './components/PageTransition';
import { InstallPrompt } from './components/InstallPrompt';
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
import { CreditsPage } from './pages/CreditsPage';
import { ProjectPaymentPage } from './pages/ProjectPaymentPage';
import { ProjectWorkPage } from './pages/ProjectWorkPage';
import { ProjectCompletionPage } from './pages/ProjectCompletionPage';
import { ChatPage } from './pages/ChatPage';
import { Dashboard } from './pages/Dashboard';
import { VerificationPage } from './pages/VerificationPage';
import { EditProfilePage } from './pages/EditProfilePage';
import { ExpensesPage } from './pages/ExpensesPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { ArtisanPublicProfilePage } from './pages/ArtisanPublicProfilePage';
import { FavoritesPage } from './pages/FavoritesPage';
import { AboutPage } from './pages/AboutPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminProjects } from './pages/admin/AdminProjects';
import { AdminEscrows } from './pages/admin/AdminEscrows';
import { AdminVerifications } from './pages/admin/AdminVerifications';
import { AdminDisputes } from './pages/admin/AdminDisputes';

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
      <Route path="/onboard" element={<OnboardPage />} />
      <Route path="/artisans" element={<ArtisansPage />} />
      <Route path="/artisans/:id" element={<ArtisanPublicProfilePage />} />
      <Route path="/favorites" element={<FavoritesPage />} />
      <Route path="/category/:slug" element={<CategoryPage />} />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/create-project" element={<PrivateRoute><CreateProjectPage /></PrivateRoute>} />
      <Route path="/projects/:id" element={<PrivateRoute><ProjectDetailsPage /></PrivateRoute>} />
      <Route path="/projects/:id/payment" element={<PrivateRoute><ProjectPaymentPage /></PrivateRoute>} />
      <Route path="/projects/:id/work" element={<PrivateRoute><ProjectWorkPage /></PrivateRoute>} />
      <Route path="/projects/:id/completion" element={<PrivateRoute><ProjectCompletionPage /></PrivateRoute>} />
      <Route path="/chat/:projectId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/credits" element={<PrivateRoute><CreditsPage /></PrivateRoute>} />
      <Route path="/verification" element={<PrivateRoute><VerificationPage /></PrivateRoute>} />
      <Route path="/edit-profile" element={<PrivateRoute><EditProfilePage /></PrivateRoute>} />
      <Route path="/expenses" element={<PrivateRoute><ExpensesPage /></PrivateRoute>} />
      <Route path="/invoices" element={<PrivateRoute><InvoicesPage /></PrivateRoute>} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="/admin/projects" element={<AdminRoute><AdminProjects /></AdminRoute>} />
      <Route path="/admin/escrows" element={<AdminRoute><AdminEscrows /></AdminRoute>} />
      <Route path="/admin/verifications" element={<AdminRoute><AdminVerifications /></AdminRoute>} />
      <Route path="/admin/disputes" element={<AdminRoute><AdminDisputes /></AdminRoute>} />
      
      {/* Route catch-all pour les routes non trouvées - DOIT ÊTRE EN DERNIER */}
      <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <InstallPrompt />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ErrorBoundary>
  );
}

export default function App() {
  return <AppContent />;
}
