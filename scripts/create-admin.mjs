/**
 * Création d'un compte administrateur plateforme Mbouraké
 *
 * Utilise la clé service_role pour :
 * 1. Créer l'utilisateur dans Auth (email + mot de passe)
 * 2. Créer ou mettre à jour le profil avec role = 'admin'
 *
 * Usage (à la racine du projet) :
 *   node scripts/create-admin.mjs <email> <mot_de_passe> [nom_affiché]
 *
 * Variables d'environnement requises :
 *   VITE_SUPABASE_URL          (ou SUPABASE_URL) — URL du projet Supabase
 *   SUPABASE_SERVICE_ROLE_KEY  — Clé service role (Dashboard > Settings > API)
 *
 * Exemple :
 *   set SUPABASE_SERVICE_ROLE_KEY=eyJ... && node scripts/create-admin.mjs admin@mbourake.com MonMotDePasse123 "Super Admin"
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('Variables manquantes. Définir VITE_SUPABASE_URL (ou SUPABASE_URL) et SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const email = process.argv[2];
const password = process.argv[3];
const fullName = process.argv[4] || 'Administrateur plateforme';

if (!email || !password) {
  console.error('Usage: node scripts/create-admin.mjs <email> <mot_de_passe> [nom_affiché]');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

async function main() {
  console.log('Création du compte admin:', email);

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError) {
    if (authError.message && (authError.message.includes('already been registered') || authError.message.includes('already registered'))) {
      console.log('L\'utilisateur existe déjà dans Auth. Mise à jour du profil en admin...');
      const { data } = await supabase.auth.admin.listUsers({ per_page: 1000 });
      const user = data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) {
        console.error('Impossible de récupérer l\'utilisateur existant. Utilisez le SQL Editor : SELECT public.promote_user_to_admin(\'' + email + '\');');
        process.exit(1);
      }
      await upsertAdminProfile(supabase, user.id, email, fullName);
      console.log('Profil mis à jour : role = admin. Connectez-vous avec', email);
      return;
    }
    console.error('Erreur Auth:', authError.message);
    process.exit(1);
  }

  const userId = authData?.user?.id;
  if (!userId) {
    console.error('Utilisateur créé mais id manquant.');
    process.exit(1);
  }

  await upsertAdminProfile(supabase, userId, email, fullName);
  console.log('Compte admin créé. Connectez-vous sur la plateforme avec', email);
}

async function upsertAdminProfile(supabase, userId, email, fullName) {
  const { error: profileError } = await supabase.from('profiles').upsert(
    {
      id: userId,
      email,
      full_name: fullName,
      role: 'admin',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (profileError) {
    console.error('Erreur profil:', profileError.message);
    process.exit(1);
  }
}

main();
