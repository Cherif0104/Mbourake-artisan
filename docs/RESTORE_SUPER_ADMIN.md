# Rétablir un compte super administrateur

Si un compte qui était **admin** a été modifié en **artisan** (ou client) par erreur (par exemple après un parcours d’invitation ou une réinitialisation), vous pouvez le rétablir en exécutant la requête SQL suivante dans le **Supabase Dashboard → SQL Editor** :

```sql
-- Remplacez 'VOTRE_EMAIL@example.com' par l’email du compte à rétablir en admin
UPDATE profiles
SET role = 'admin'
WHERE email = 'VOTRE_EMAIL@example.com';
```

Exemple pour l’email `techsupport@senegel.org` :

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'techsupport@senegel.org';
```

**Note :** Désormais, le frontend ne peut plus écraser le rôle d’un utilisateur déjà **admin** : lorsqu’un admin se connecte (même avec `?role=artisan` dans l’URL), son rôle reste **admin**.
