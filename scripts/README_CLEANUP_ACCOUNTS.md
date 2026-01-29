# Nettoyage des comptes de test et données orphelines

## Contexte

Lorsqu'on supprime un utilisateur dans **Supabase > Authentication > Users**, seul le compte Auth est supprimé. Les données liées dans le schéma `public` (profiles, artisans, projects, quotes, etc.) restent en base. Ces profils « orphelins » continuent d'apparaître dans les **catégories**, la **recherche** et les **profils publics**, alors qu'on ne peut plus se connecter avec ces comptes.

Deux types de nettoyage sont proposés :

| Script | Usage |
|--------|--------|
| **`cleanup-orphaned-profiles-only.sql`** | Supprime **uniquement** les profils orphelins (id présent en `public.profiles` mais absent de `auth.users`). Garde tous les comptes qui ont encore une connexion. Idéal pour retirer les « fantômes » des listes sans toucher aux vrais comptes. |
| **`cleanup-test-accounts.sql`** | Supprime tous les profils **sauf** ceux dont l'email est dans une liste fixe (vos 3 emails). À utiliser si vous voulez ne garder que ces comptes et tout supprimer d’autre. |

---

## Nettoyer uniquement les orphelins (recommandé en premier)

1. Ouvrir **Supabase Dashboard** > **SQL Editor**.
2. Créer une nouvelle requête.
3. Copier-coller le contenu de **`scripts/cleanup-orphaned-profiles-only.sql`**.
4. **(Optionnel)** Décommenter la section « Étape 0 : Vérification » en haut, exécuter uniquement cette partie pour voir le nombre de profils orphelins et de projets concernés.
5. Exécuter **tout** le script. Seuls les profils sans compte Auth (et leurs données) sont supprimés ; les comptes actifs restent intacts.

Après exécution, les catégories (ex. « Agent de sécurité privée ») et la recherche n’afficheront plus les artisans de test dont l’email a été supprimé dans Supabase.

---

## Comptes conservés (script par liste d’emails)

Le script **`cleanup-test-accounts.sql`** conserve **uniquement** les comptes dont l’email est :

- `contact.cherif.pro@gmail.com`
- `myimmogis@gmail.com`
- `niangcherifoumaraidara@gmail.com`

Tous les autres profils (et tout ce qui leur est lié) sont supprimés. À utiliser si vous voulez tout nettoyer sauf ces trois comptes.

---

## Comment exécuter un script

1. Ouvrir **Supabase Dashboard** > **SQL Editor**.
2. Créer une nouvelle requête.
3. Copier-coller le contenu de **`scripts/cleanup-test-accounts.sql`**.
4. **Vérification (recommandé)** : décommenter la section « Étape 0 : Vérification » en haut du script, exécuter uniquement cette partie, et vérifier les comptages (profils à supprimer, projets concernés).
5. Remettre en commentaire l'« Étape 0 » puis exécuter **tout le script** (Étapes 1 et 2).

Le script ne modifie **pas** la table `auth.users` : si des comptes Auth orphelins restent visibles dans Authentication > Users, vous pouvez les supprimer manuellement.

---

## En cas d'erreur sur une table

Si une table n'existe pas (ex. `notifications`, `favorites`), vous obtiendrez une erreur « relation … does not exist ». Commentez ou supprimez la ligne `DELETE FROM public.<table> ...` correspondante dans le script, puis ré-exécutez.

---

## Pour le futur

### Script « un seul utilisateur par email »

Le fichier **`scripts/delete-one-user-by-email.sql`** permet de supprimer toutes les données d'un seul compte. Modifier la variable `target_email` en haut du script, exécuter, puis supprimer l'utilisateur dans **Authentication > Users** si le compte Auth existe encore.

### Bouton « Supprimer mon compte » dans l’app

Une **Edge Function** `delete-my-account` et un **bouton dans Paramètres** (page Modifier mon profil) permettent à l’utilisateur (artisan ou client) de supprimer toutes ses données et son compte Auth en un clic.

- **Emplacement** : Page « Modifier mon profil » (Paramètres) → section « Paramètres du compte » → bouton « Supprimer mon compte et toutes mes données ».
- **Déploiement** : Déployer la fonction avec `supabase functions deploy delete-my-account`. Les secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` et `SUPABASE_ANON_KEY` sont en général déjà disponibles ; si `SUPABASE_ANON_KEY` manque, l’ajouter dans le Dashboard Supabase (Edge Functions > Secrets).
