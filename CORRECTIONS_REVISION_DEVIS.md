# Corrections pour le système de révision de devis

## Problèmes identifiés lors des tests

1. **Bouton "Demander une révision" non visible côté client**
   - Le bouton n'apparaît que si le devis est accepté
   - Il doit être visible même si le devis est en "pending" ou "viewed"

2. **Notifications manquantes**
   - Pas de notification quand une révision est demandée
   - Pas de notification quand l'artisan répond à une révision

3. **Page blanche côté artisan**
   - Quand l'artisan clique sur la notification, il doit voir la révision
   - Le paramètre `?revision=id` doit être géré correctement

4. **Chat/messagerie**
   - Le chat doit être accessible depuis la page de projet
   - Le chat doit être créé automatiquement après acceptation d'un devis

## Fichiers de patch à appliquer

1. `patch_notificationService.patch` - Ajout des notifications de révision
2. `patch_QuoteRevisionModal.patch` - Notification artisan après création
3. `patch_QuoteRevisionResponseModal.patch` - Notification client après réponse
4. `patch_NotificationBell.patch` - Gestion des clics sur notifications de révision
5. `patch_ProjectDetailsPage.patch` - Affichage bouton révision + gestion URL

## Comment appliquer les patches

```bash
# Appliquer chaque patch
git apply patch_notificationService.patch
git apply patch_QuoteRevisionModal.patch
git apply patch_QuoteRevisionResponseModal.patch
git apply patch_NotificationBell.patch
git apply patch_ProjectDetailsPage.patch
```

Ou manuellement en suivant les instructions dans chaque fichier de patch.
