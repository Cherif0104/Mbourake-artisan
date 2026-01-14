import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { PrivateRoute } from './components/PrivateRoute';
import { AdminRoute } from './components/AdminRoute';
import { LoginPage } from './pages/LoginPage';
import { ProfileSetupPage } from './pages/ProfileSetupPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { LandingPage } from './pages/LandingPage';
import { ArtisansPage } from './pages/ArtisansPage';
import { CategoryPage } from './pages/CategoryPage';
import { CreateProjectPage } from './pages/CreateProjectPage';
import { ProjectDetailsPage } from './pages/ProjectDetailsPage';
import { ChatPage } from './pages/ChatPage';
import { Dashboard } from './pages/Dashboard';
import { VerificationPage } from './pages/VerificationPage';
import { EditProfilePage } from './pages/EditProfilePage';
import { ArtisanPublicProfilePage } from './pages/ArtisanPublicProfilePage';
import { FavoritesPage } from './pages/FavoritesPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminProjects } from './pages/admin/AdminProjects';
import { AdminEscrows } from './pages/admin/AdminEscrows';
import { AdminVerifications } from './pages/admin/AdminVerifications';
import { AdminDisputes } from './pages/admin/AdminDisputes';

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<OnboardingPage />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/artisans" element={<ArtisansPage />} />
      <Route path="/artisans/:id" element={<ArtisanPublicProfilePage />} />
      <Route path="/favorites" element={<FavoritesPage />} />
      <Route path="/category/:slug" element={<CategoryPage />} />
      <Route path="/login" element={<LoginPage />} />
      
      {/* Protected Routes */}
      <Route path="/profile-setup" element={<ProfileSetupPage />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/create-project" element={<PrivateRoute><CreateProjectPage /></PrivateRoute>} />
      <Route path="/projects/:id" element={<PrivateRoute><ProjectDetailsPage /></PrivateRoute>} />
      <Route path="/chat/:projectId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
      <Route path="/verification" element={<PrivateRoute><VerificationPage /></PrivateRoute>} />
      <Route path="/edit-profile" element={<PrivateRoute><EditProfilePage /></PrivateRoute>} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
      <Route path="/admin/projects" element={<AdminRoute><AdminProjects /></AdminRoute>} />
      <Route path="/admin/escrows" element={<AdminRoute><AdminEscrows /></AdminRoute>} />
      <Route path="/admin/verifications" element={<AdminRoute><AdminVerifications /></AdminRoute>} />
      <Route path="/admin/disputes" element={<AdminRoute><AdminDisputes /></AdminRoute>} />
    </Routes>
  );
}
