/**
 * Test Runner Automatique - Mbouraké
 * 
 * Ce script permet d'exécuter des tests fonctionnels basiques
 * pour vérifier que les routes et composants principaux sont accessibles.
 * 
 * Usage: node tests/test-runner.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Liste des fichiers à vérifier
const filesToCheck = {
  // Pages principales
  'LoginPage': 'src/pages/LoginPage.tsx',
  'ProfileSetupPage': 'src/pages/ProfileSetupPage.tsx',
  'Dashboard': 'src/pages/Dashboard.tsx',
  'CreateProjectPage': 'src/pages/CreateProjectPage.tsx',
  'ProjectDetailsPage': 'src/pages/ProjectDetailsPage.tsx',
  'ChatPage': 'src/pages/ChatPage.tsx',
  'VerificationPage': 'src/pages/VerificationPage.tsx',
  'EditProfilePage': 'src/pages/EditProfilePage.tsx',
  'ExpensesPage': 'src/pages/ExpensesPage.tsx',
  'InvoicesPage': 'src/pages/InvoicesPage.tsx',
  
  // Admin
  'AdminDashboard': 'src/pages/admin/AdminDashboard.tsx',
  'AdminUsers': 'src/pages/admin/AdminUsers.tsx',
  'AdminProjects': 'src/pages/admin/AdminProjects.tsx',
  'AdminEscrows': 'src/pages/admin/AdminEscrows.tsx',
  'AdminVerifications': 'src/pages/admin/AdminVerifications.tsx',
  'AdminDisputes': 'src/pages/admin/AdminDisputes.tsx',
  
  // Composants
  'PrivateRoute': 'src/components/PrivateRoute.tsx',
  'AdminRoute': 'src/components/AdminRoute.tsx',
  'QuoteForm': 'src/components/QuoteForm.tsx',
  'EscrowBanner': 'src/components/EscrowBanner.tsx',
  'NotificationBell': 'src/components/NotificationBell.tsx',
  'Toast': 'src/components/Toast.tsx',
  'SkeletonScreen': 'src/components/SkeletonScreen.tsx',
  
  // Hooks
  'useAuth': 'src/hooks/useAuth.ts',
  'useProfile': 'src/hooks/useProfile.ts',
  'useNotifications': 'src/hooks/useNotifications.ts',
  
  // Config
  'App': 'src/App.tsx',
  'main': 'src/main.tsx',
};

const results = {
  passed: [],
  failed: [],
  notFound: []
};

console.log('🧪 TEST RUNNER - VÉRIFICATION DES FICHIERS\n');
console.log('='.repeat(60));

// Vérifier chaque fichier
for (const [name, filePath] of Object.entries(filesToCheck)) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (fs.existsSync(fullPath)) {
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Vérifications basiques
      const checks = {
        hasContent: content.length > 0,
        hasExports: content.includes('export') || content.includes('export default'),
        isNotEmpty: content.trim().length > 10
      };
      
      if (checks.hasContent && checks.hasExports && checks.isNotEmpty) {
        results.passed.push({ name, filePath });
        console.log(`✅ ${name.padEnd(25)} ${filePath}`);
      } else {
        results.failed.push({ name, filePath, reason: 'Fichier vide ou sans exports' });
        console.log(`⚠️  ${name.padEnd(25)} ${filePath} - Fichier suspect`);
      }
    } catch (error) {
      results.failed.push({ name, filePath, reason: error.message });
      console.log(`❌ ${name.padEnd(25)} ${filePath} - Erreur: ${error.message}`);
    }
  } else {
    results.notFound.push({ name, filePath });
    console.log(`❌ ${name.padEnd(25)} ${filePath} - FICHIER NON TROUVÉ`);
  }
}

console.log('='.repeat(60));
console.log('\n📊 RÉSULTATS:');
console.log(`✅ Passés: ${results.passed.length}`);
console.log(`❌ Échecs: ${results.failed.length}`);
console.log(`❓ Non trouvés: ${results.notFound.length}`);
console.log(`📁 Total: ${Object.keys(filesToCheck).length}`);

// Vérifier les migrations SQL
console.log('\n🗄️  VÉRIFICATION MIGRATIONS SQL:');
const migrationsPath = path.join(process.cwd(), 'supabase/migrations');
if (fs.existsSync(migrationsPath)) {
  const migrations = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'));
  console.log(`✅ ${migrations.length} migrations trouvées`);
  migrations.forEach(m => console.log(`   - ${m}`));
} else {
  console.log('❌ Dossier migrations non trouvé');
}

// Résumé
const successRate = ((results.passed.length / Object.keys(filesToCheck).length) * 100).toFixed(1);
console.log(`\n📈 Taux de succès: ${successRate}%`);

if (results.failed.length > 0 || results.notFound.length > 0) {
  console.log('\n⚠️  PROBLÈMES IDENTIFIÉS:');
  [...results.failed, ...results.notFound].forEach(({ name, filePath, reason }) => {
    console.log(`   - ${name}: ${filePath}${reason ? ` (${reason})` : ''}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ Tous les fichiers sont présents et valides!');
  process.exit(0);
}
