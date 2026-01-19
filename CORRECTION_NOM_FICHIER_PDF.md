# Correction : Erreur "Invalid key" lors de l'upload PDF

## 🔴 Problème Identifié

**Erreur 1** : `Invalid key: f57d9a87-50af-4aeb-b97b-fc94cfd87f41/proformas/1768580581721-DIAGNOSTIC ORGANISATIONNEL & RELATIONNEL (Le _Style_) - Voilà ce que tu as fait c'est bien mais j'aimerai....pdf`

**Erreur 2** : `409 (Conflict)` lors de la création du devis

**Causes** :
1. **Nom de fichier invalide** : Le nom du fichier contient des caractères spéciaux non autorisés par Supabase Storage (`&`, `()`, `'`, espaces, accents)
2. **Devis existant** : Possible doublon lors de la création du devis

## ✅ Solutions Appliquées

### 1. Fonction Utilitaire `fileUtils.ts`

**Fichier créé : `src/lib/fileUtils.ts`**

Fonctions pour nettoyer les noms de fichiers :
- ✅ **`sanitizeFileName()`** : Nettoie un nom de fichier
  - Normalise les accents (é → e, à → a, etc.)
  - Remplace les caractères spéciaux par des underscores
  - Garde uniquement lettres, chiffres, underscores, tirets et points
  - Limite la longueur à 200 caractères

- ✅ **`generateSafeFileName()`** : Génère un nom sécurisé avec timestamp
  - Utilise `sanitizeFileName()` pour nettoyer le nom
  - Ajoute un timestamp et un identifiant aléatoire
  - Évite les conflits de noms

### 2. Correction de `QuoteForm.tsx`

**Modifications** :

1. **Nettoyage du nom de fichier avant upload** :
```typescript
// Avant
const fileName = `${artisanId}/proformas/${Date.now()}-${proformaFile.name}`;

// Après
const safeFileName = generateSafeFileName(proformaFile.name);
const fileName = `${artisanId}/proformas/${safeFileName}`;
```

2. **Vérification de devis existant** :
   - Vérifie si un devis existe déjà pour ce projet/artisan
   - Affiche un message clair si un devis existe déjà
   - Évite les erreurs 409 (Conflict)

3. **Messages d'erreur améliorés** :
   - Détection des erreurs de doublon (code 23505)
   - Messages d'erreur plus clairs pour l'utilisateur

## 🧪 Exemples de Nettoyage

| Nom Original | Nom Nettoyé |
|--------------|-------------|
| `DIAGNOSTIC ORGANISATIONNEL & RELATIONNEL (Le _Style_) - Voilà...pdf` | `DIAGNOSTIC_ORGANISATIONNEL_RELATIONNEL_Le_Style_Voila.pdf` |
| `Facture 2026 (Résumé).pdf` | `Facture_2026_Resume.pdf` |
| `Devis Numéro 1/2026.pdf` | `Devis_Numero_1_2026.pdf` |

## 📋 Tests à Effectuer

1. **Upload PDF avec caractères spéciaux** :
   - ✅ Uploadez un PDF avec des accents, espaces, caractères spéciaux
   - ✅ Vérifiez que l'upload fonctionne sans erreur "Invalid key"

2. **Création de devis** :
   - ✅ Créez un devis normalement
   - ✅ Essayez de créer un deuxième devis pour le même projet
   - ✅ Vérifiez que le message d'erreur est clair

3. **Vérification des noms de fichiers** :
   - ✅ Vérifiez dans Supabase Storage que les fichiers sont bien nommés
   - ✅ Vérifiez que les accents et caractères spéciaux sont nettoyés

## 🎯 Statut

✅ **Code corrigé** - Fonction utilitaire créée, QuoteForm mis à jour

---

**Date** : 2025-01-04  
**Fichiers modifiés** :
- `src/lib/fileUtils.ts` (créé)
- `src/components/QuoteForm.tsx` (corrigé)
