# Correction : Erreur de Création de Projet

## 🔴 Problème Identifié

Erreur lors de la création de projet :
```
invalid input syntax for type integer: "2026-000"
400 (Bad Request)
```

## 🔍 Cause Probable

L'erreur suggère qu'un champ de type `integer` dans la base de données reçoit une valeur de type string ou un format incorrect. Cela peut provenir de :

1. **Champs numériques (`max_distance_km`, `min_rating`)** : Les valeurs peuvent être envoyées comme strings au lieu de numbers
2. **Champ `property_details.floor`** : Si ce champ existe dans la base comme `integer`, mais qu'on envoie une chaîne vide `""`

## ✅ Corrections Appliquées

### 1. Validation et Conversion des Valeurs Numériques

**Fichier : `src/pages/CreateProjectPage.tsx`**

- ✅ Conversion explicite de `maxDistanceKm` et `minRating` en `Number()` avant l'insertion
- ✅ Vérification que ces valeurs ne sont pas `null` avant la conversion

```typescript
max_distance_km: isOpen ? (maxDistanceKm !== null ? Number(maxDistanceKm) : null) : null,
min_rating: isOpen ? (minRating !== null ? Number(minRating) : null) : null,
```

### 2. Nettoyage de `property_details`

- ✅ Suppression du champ `floor` qui n'est plus utilisé dans l'interface
- ✅ Vérification que `property_details` est correctement formaté en JSON
- ✅ Suppression des valeurs vides qui pourraient causer des problèmes

```typescript
let propertyDetailsJson = null;
if (propertyDetails.type) {
  propertyDetailsJson = {
    type: propertyDetails.type,
    accessNotes: propertyDetails.accessNotes || null,
  };
}
```

### 3. Messages d'Erreur Améliorés

- ✅ Message d'erreur spécifique pour les erreurs de type integer
- ✅ Meilleure gestion des erreurs d'autorisation (RLS)
- ✅ Logging détaillé pour faciliter le débogage

```typescript
if (projectError) {
  console.error('Erreur création projet:', projectError);
  let errorMessage = projectError.message;
  if (projectError.message?.includes('invalid input syntax for type integer')) {
    errorMessage = "Erreur de format de données. Veuillez vérifier les champs numériques (distance, note minimum).";
  }
  throw new Error(errorMessage);
}
```

### 4. Vérification des Valeurs NULL

- ✅ S'assurer que `location` peut être `null` si vide
- ✅ Tous les champs optionnels sont correctement gérés avec `|| null`

## 🧪 Tests à Effectuer

1. **Création de projet avec distance maximum** :
   - Sélectionner "5 km", "10 km", "20 km", etc.
   - Vérifier que le projet est créé sans erreur

2. **Création de projet avec note minimum** :
   - Sélectionner "1★", "2★", "3★", "4★", "5★"
   - Vérifier que le projet est créé sans erreur

3. **Création de projet sans filtres** :
   - Sélectionner "Tous" pour distance et note
   - Vérifier que `null` est correctement envoyé

4. **Création de projet avec détails du logement** :
   - Remplir le type de bien (Commerce, Appartement, etc.)
   - Ajouter des notes d'accès
   - Vérifier que `property_details` est correctement enregistré

## 📋 Notes Supplémentaires

### Format `project_number`

Le trigger `generate_project_number()` génère un numéro au format `ANNEE-NNNNNNNN` (ex: `2026-00000001`). Si vous voyez encore l'erreur `"2026-000"`, cela pourrait indiquer :

1. **Séquence de base de données** : La séquence `project_number_seq` pourrait être à 0
2. **Format de numéro** : Vérifiez que le trigger génère bien 8 chiffres après le tiret

**Solution** : Si le problème persiste, réinitialisez la séquence :
```sql
ALTER SEQUENCE project_number_seq RESTART WITH 1;
```

### Prochaines Étapes

Si l'erreur persiste après ces corrections :

1. Vérifier les logs détaillés dans la console du navigateur (F12)
2. Vérifier la structure de la table `projects` dans Supabase
3. Vérifier que toutes les migrations ont été appliquées
4. Tester avec un projet minimal (sans options avancées)

## 🎯 Statut

✅ **Corrections appliquées** - À tester en localhost

---

**Date** : 2025-01-04  
**Fichiers modifiés** : `src/pages/CreateProjectPage.tsx`
