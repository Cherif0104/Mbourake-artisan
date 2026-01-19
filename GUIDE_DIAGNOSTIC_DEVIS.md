# Guide de Diagnostic - Problème de Devis Non Visibles

## Problème
Un devis existe dans la base de données mais n'apparaît pas dans l'interface, côté client ou artisan.

## Étapes de Diagnostic

### 1. Vérifier la Console du Navigateur
Ouvrez la console du navigateur (F12) et cherchez les logs `[DEBUG]` qui commencent par :
- `[DEBUG] Fetching quotes for project:`
- `[DEBUG] Quotes with profile - Data:`
- `[DEBUG] Final quotes array length:`

Ces logs indiquent combien de devis ont été récupérés et s'il y a des erreurs.

### 2. Vérifier dans Supabase SQL Editor
Utilisez le script `scripts/diagnose-quotes.sql` pour vérifier directement dans la base de données :

1. Ouvrez Supabase Dashboard > SQL Editor
2. Remplacez `'PROJECT_ID'` par l'ID du projet concerné
3. Exécutez les requêtes pour voir :
   - Tous les devis du projet
   - Leur statut
   - Les politiques RLS en place

### 3. Vérifications à Faire

#### A. Le devis existe-t-il vraiment ?
```sql
SELECT * FROM quotes WHERE project_id = 'VOTRE_PROJECT_ID';
```

#### B. Quel est le statut du devis ?
- `pending` : Devrait être visible
- `viewed` : Devrait être visible
- `accepted` : Devrait être visible
- `rejected` : Peut être masqué selon l'implémentation
- `abandoned` : Peut être masqué

#### C. Les politiques RLS permettent-elles la lecture ?
Vérifiez avec :
```sql
SELECT * FROM pg_policies WHERE tablename = 'quotes';
```

Assurez-vous qu'il existe une politique permettant aux utilisateurs authentifiés de lire les devis de leurs projets.

#### D. Le projet est-il dans le bon statut ?
Un projet `cancelled` ou `expired` peut masquer les devis. Vérifiez :
```sql
SELECT id, title, status FROM projects WHERE id = 'VOTRE_PROJECT_ID';
```

### 4. Solutions Temporaires

#### Solution 1 : Rafraîchissement Manuel
- Cliquez sur le bouton "Rafraîchir ↻" dans la section des devis
- Ou utilisez F5 pour recharger la page

#### Solution 2 : Vérifier les Logs de Débogage
Les logs `[DEBUG]` dans la console indiquent :
- Si les devis sont récupérés mais non affichés
- Si les profils sont manquants
- Si les erreurs sont silencieuses

### 5. Corrections à Appliquer si Nécessaire

Si les devis existent en base mais ne sont pas récupérés :
1. Vérifiez les politiques RLS dans Supabase
2. Vérifiez que l'utilisateur connecté a les bonnes permissions
3. Vérifiez que le `project_id` et `artisan_id` sont corrects

## Contact
Si le problème persiste après ces vérifications, vérifiez les logs `[DEBUG]` et partagez-les pour diagnostic approfondi.
