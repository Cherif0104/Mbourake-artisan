/**
 * Script de diagnostic pour vérifier un ID dans la base de données
 * Usage: node scripts/diagnose-id.js <UUID>
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement depuis .env.local
let supabaseUrl, supabaseKey;
try {
  const envFile = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
  const envVars = {};
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.+)$/);
    if (match) {
      envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
  supabaseUrl = envVars.VITE_SUPABASE_URL;
  supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;
} catch (err) {
  console.warn('⚠️  Impossible de charger .env.local, utilisez les variables d\'environnement système');
  supabaseUrl = process.env.VITE_SUPABASE_URL;
  supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erreur: Variables d\'environnement manquantes');
  console.error('Assurez-vous que VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont définies dans .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const targetId = process.argv[2] || 'bf479d31-81c3-4fb1-b218-9a302e1ffb7a';

console.log(`\n🔍 Diagnostic pour l'ID: ${targetId}\n`);
console.log('─'.repeat(60));

async function diagnose() {
  // 1. Vérifier dans projects
  console.log('\n📋 1. Recherche dans la table "projects"...');
  const { data: projects, error: pError } = await supabase
    .from('projects')
    .select('id, title, project_number, status, client_id, category_id, created_at')
    .eq('id', targetId)
    .single();

  if (pError) {
    if (pError.code === 'PGRST116') {
      console.log('   ❌ Aucun projet trouvé avec cet ID');
    } else {
      console.log(`   ❌ Erreur: ${pError.message} (code: ${pError.code})`);
    }
  } else if (projects) {
    console.log('   ✅ Projet trouvé:');
    console.log(`      - Titre: ${projects.title}`);
    console.log(`      - Numéro: ${projects.project_number || 'N/A'}`);
    console.log(`      - Statut: ${projects.status}`);
    console.log(`      - Client ID: ${projects.client_id}`);
    console.log(`      - Créé le: ${projects.created_at}`);
  }

  // 2. Vérifier dans quotes
  console.log('\n💼 2. Recherche dans la table "quotes"...');
  const { data: quotes, error: qError } = await supabase
    .from('quotes')
    .select('id, project_id, artisan_id, amount, status, created_at')
    .or(`id.eq.${targetId},project_id.eq.${targetId}`)
    .limit(10);

  if (qError) {
    console.log(`   ❌ Erreur: ${qError.message}`);
  } else if (quotes && quotes.length > 0) {
    console.log(`   ✅ ${quotes.length} devis trouvé(s):`);
    quotes.forEach((q, i) => {
      const isMatch = q.id === targetId;
      console.log(`      ${i + 1}. ${isMatch ? '★ MATCH ID ★' : 'Projet lié'}`);
      console.log(`         - ID: ${q.id}`);
      console.log(`         - Projet ID: ${q.project_id}`);
      console.log(`         - Montant: ${q.amount} FCFA`);
      console.log(`         - Statut: ${q.status}`);
      console.log(`         - Créé le: ${q.created_at}`);
    });
  } else {
    console.log('   ❌ Aucun devis trouvé avec cet ID');
  }

  // 3. Vérifier dans escrows
  console.log('\n💰 3. Recherche dans la table "escrows"...');
  const { data: escrows, error: eError } = await supabase
    .from('escrows')
    .select('id, project_id, total_amount, status, created_at')
    .or(`id.eq.${targetId},project_id.eq.${targetId}`)
    .limit(10);

  if (eError) {
    console.log(`   ❌ Erreur: ${eError.message}`);
  } else if (escrows && escrows.length > 0) {
    console.log(`   ✅ ${escrows.length} escrow trouvé(s):`);
    escrows.forEach((e, i) => {
      const isMatch = e.id === targetId;
      console.log(`      ${i + 1}. ${isMatch ? '★ MATCH ID ★' : 'Projet lié'}`);
      console.log(`         - ID: ${e.id}`);
      console.log(`         - Projet ID: ${e.project_id}`);
      console.log(`         - Montant: ${e.total_amount} FCFA`);
      console.log(`         - Statut: ${e.status}`);
    });
  } else {
    console.log('   ❌ Aucun escrow trouvé avec cet ID');
  }

  // 4. Vérifier dans notifications
  console.log('\n🔔 4. Recherche dans la table "notifications"...');
  const { data: notifications, error: nError } = await supabase
    .from('notifications')
    .select('id, type, title, data, created_at')
    .or(`id.eq.${targetId},data->>project_id.eq.${targetId},data->>quote_id.eq.${targetId}`)
    .limit(10);

  if (nError) {
    console.log(`   ⚠️  Erreur (table peut ne pas exister dans les types): ${nError.message}`);
  } else if (notifications && notifications.length > 0) {
    console.log(`   ✅ ${notifications.length} notification(s) trouvée(s):`);
    notifications.forEach((n, i) => {
      console.log(`      ${i + 1}. ${n.type}: ${n.title}`);
      console.log(`         - ID: ${n.id}`);
      console.log(`         - Données:`, JSON.stringify(n.data, null, 2));
    });
  } else {
    console.log('   ❌ Aucune notification trouvée avec cet ID');
  }

  // 5. Vérifier dans profiles
  console.log('\n👤 5. Recherche dans la table "profiles"...');
  const { data: profiles, error: prError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .eq('id', targetId)
    .single();

  if (prError) {
    if (prError.code === 'PGRST116') {
      console.log('   ❌ Aucun profil trouvé avec cet ID');
    } else {
      console.log(`   ❌ Erreur: ${prError.message}`);
    }
  } else if (profiles) {
    console.log('   ✅ Profil trouvé:');
    console.log(`      - Nom: ${profiles.full_name}`);
    console.log(`      - Email: ${profiles.email}`);
    console.log(`      - Rôle: ${profiles.role}`);
  }

  console.log('\n' + '─'.repeat(60));
  console.log('\n✨ Diagnostic terminé\n');
}

diagnose().catch(console.error);
