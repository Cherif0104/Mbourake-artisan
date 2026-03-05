# Référentiel des notifications et alertes – Mbourake

Toutes les actions qui déclenchent une **notification** (en base, visible en temps réel dans la cloche et sur la page Notifications) sont listées ci‑dessous. Les notifications sont diffusées en **temps réel** via Supabase Realtime (publication `supabase_realtime`, table `notifications`).

---

## Types de notifications (enum / usage)

| Type | Qui reçoit | Description courte |
|------|------------|--------------------|
| `new_project` | Artisan(s) | Nouvelle demande publiée (catégorie ou ciblée) |
| `new_quote` | Client | Un artisan a soumis un devis |
| `quote_accepted` | Artisan | Son devis a été accepté |
| `quote_rejected` | Artisan | Son devis a été refusé |
| `quote_revision_requested` | Artisan | Le client demande une révision du devis |
| `quote_revision_responded` | Client | Réponse à la demande de révision (via `system` + `kind`) |
| `project_completed` | Client ou Artisan | Travaux terminés / demande de clôture / clôture confirmée |
| `payment_received` | Artisan | Paiement reçu ou sécurisé (escrow) |
| `verification_approved` | Artisan | Vérification de profil approuvée |
| `verification_rejected` | Artisan | Vérification de profil refusée |
| `new_message` | Client ou Artisan | Nouveau message dans le chat projet |
| `dispute_raised` | Client ou Artisan | Litige signalé sur le projet |
| `system` | Variable | Alertes diverses (révision, abandon, etc.) |

---

## Historique des actions → notification

### 1. Nouveau projet créé
- **Action** : Client publie un projet (ouvert ou ciblé).
- **Fichier** : `CreateProjectPage.tsx` → `notificationService.notifyArtisansNewProject()` (+ insert direct si ciblé).
- **Type** : `new_project`.
- **Destinataires** : Artisans de la catégorie (ou 1 artisan ciblé).
- **Temps réel** : Oui (INSERT sur `notifications`).

### 2. Devis soumis
- **Action** : Artisan envoie un devis sur un projet.
- **Fichier** : `QuoteForm.tsx` → `notifyClientNewQuote()`.
- **Type** : `new_quote`.
- **Destinataire** : Client du projet.
- **Temps réel** : Oui.

### 3. Devis accepté
- **Action** : Client accepte un devis.
- **Fichier** : `ProjectDetailsPage.tsx` → `notifyArtisanQuoteAccepted()`.
- **Type** : `quote_accepted`.
- **Destinataire** : Artisan du devis.
- **Temps réel** : Oui.

### 4. Devis refusé
- **Action** : Client refuse un devis.
- **Fichier** : `ProjectDetailsPage.tsx` → `notifyArtisanQuoteRejected()`.
- **Type** : `quote_rejected`.
- **Destinataire** : Artisan du devis.
- **Temps réel** : Oui.

### 5. Demande de révision (client → artisan)
- **Action** : Client demande une révision du devis.
- **Fichiers** : `QuoteRevisionModal.tsx`, `RequestRevisionPage.tsx` → `notifyArtisanRevisionRequested()`.
- **Type** : `quote_revision_requested` (ou `system` si enum absent).
- **Destinataire** : Artisan.
- **Temps réel** : Oui.

### 6. Réponse à la révision (artisan → client)
- **Action** : Artisan accepte / refuse / modifie la révision.
- **Fichiers** : `QuoteRevisionResponseModal.tsx`, `RevisionResponsePage.tsx` → `notifyClientRevisionResponded()`.
- **Type** : `system` (data.kind = `quote_revision_responded`).
- **Destinataire** : Client.
- **Temps réel** : Oui.

### 7. Travaux terminés (artisan → client)
- **Action** : Artisan marque les travaux comme terminés.
- **Fichiers** : `ProjectWorkPage.tsx`, `ProjectDetailsPage.tsx` → `notifyClientProjectCompleted()`.
- **Type** : `project_completed`.
- **Destinataire** : Client.
- **Temps réel** : Oui.

### 8. Demande de clôture (client → artisan)
- **Action** : Client demande la clôture (travaux terminés).
- **Fichier** : `ProjectDetailsPage.tsx` → `notifyArtisanClientRequestedCompletion()`.
- **Type** : `project_completed`.
- **Destinataire** : Artisan.
- **Temps réel** : Oui.

### 9. Clôture confirmée (client → artisan)
- **Action** : Client confirme la clôture et la notation.
- **Fichier** : `ProjectDetailsPage.tsx` → `notifyArtisanClientConfirmedClosure()`.
- **Type** : `project_completed`.
- **Destinataire** : Artisan.
- **Temps réel** : Oui.

### 10. Artisan abandonne le devis
- **Action** : Artisan clôture sa participation (abandon).
- **Fichier** : `ProjectDetailsPage.tsx` → `notifyClientArtisanAbandoned()`.
- **Type** : `system`.
- **Destinataire** : Client.
- **Temps réel** : Oui.

### 11. Paiement reçu / sécurisé (escrow)
- **Action** : Client paie → montant en escrow, ou clôture → versement artisan.
- **Fichiers** : `useEscrow.ts` → `notifyArtisanPaymentHeldWithBreakdown()`, `notifyArtisanPaymentReceived()` ; `ProjectCompletionPage.tsx`, `AdminClosures.tsx`, `AdminEscrows.tsx` (inserts directs ou service).
- **Type** : `payment_received`.
- **Destinataire** : Artisan.
- **Temps réel** : Oui.

### 12. Nouveau message (chat)
- **Action** : Envoi d’un message dans le chat du projet.
- **Fichier** : `ChatPage.tsx` → `notifyNewMessage()`.
- **Type** : `new_message`.
- **Destinataire** : L’autre participant (client ou artisan).
- **Temps réel** : Oui.

### 13. Litige signalé
- **Action** : Client ou artisan signale un litige.
- **Fichiers** : `ProjectDetailsPage.tsx` → `notifyOtherPartyDisputeRaised()` ; `AdminDisputes.tsx` (inserts directs).
- **Type** : `dispute_raised` ou `system`.
- **Destinataire** : L’autre partie (ou admin).
- **Temps réel** : Oui.

### 14. Vérification profil (admin)
- **Action** : Admin approuve ou rejette la vérification d’un artisan.
- **Fichier** : `AdminVerifications.tsx` → insert direct dans `notifications`.
- **Types** : `verification_approved`, `verification_rejected`.
- **Destinataire** : Artisan.
- **Temps réel** : Oui.

### 15. Avis / notation (client → artisan)
- **Action** : Client note l’artisan après clôture.
- **Fichier** : `RatingModal.tsx` → insert direct.
- **Type** : selon implémentation (souvent `system` ou dédié).
- **Destinataire** : Artisan.
- **Temps réel** : Oui.

---

## Configuration temps réel

- **Table** : `public.notifications`.
- **Publication** : `supabase_realtime` (migration `20260307100000_enable_realtime_notifications.sql`).
- **Côté client** : `useNotifications.ts` s’abonne aux `INSERT` et `UPDATE` avec `filter: user_id=eq.<current_user_id>`.
- **Comportement** : à chaque nouvelle ligne pour l’utilisateur connecté, la liste et le compteur non lus se mettent à jour immédiatement.

---

## Comportement « appli native »

Pour que les alertes réagissent comme sur une appli native :

1. **Temps réel** : Les nouvelles notifications arrivent sans rafraîchir (abonnement Supabase Realtime).
2. **Son** : Un son est joué à chaque nouvelle notification (`playNotificationSound()` dans `useNotifications`).
3. **Toast** : Un toast affiche le titre de la notification (ex. « Nouveau message », « Devis accepté ! ») via `NotificationRealtimeToaster`.
4. **Vibration** : Sur mobile, `navigator.vibrate(200)` est déclenché à l’arrivée d’une notification.
5. **Badge onglet** : Le titre de l’onglet affiche le nombre de non lus, ex. « (3) Mbourake », mis à jour en direct.
6. **Sync multi-onglets** : Les marquages « lu » sont synchronisés (abonnement aux `UPDATE` sur `notifications`).

---

## Alertes toasts (sans notification en base)

Les **toasts** (messages éphémères en haut/bas de l’écran) sont utilisés pour des retours immédiats (succès formulaire, erreur, avertissement). Ils ne sont pas persistés dans `notifications`. Voir `ToastContext` et usages de `success`, `error`, `warning`, `info` dans les pages.

---

## Résumé

| Source | Type(s) | Destinataire | Temps réel |
|--------|--------|--------------|------------|
| CreateProjectPage | new_project | Artisan(s) | Oui |
| QuoteForm | new_quote | Client | Oui |
| ProjectDetailsPage | quote_accepted, quote_rejected, project_completed, system, dispute_raised | Artisan / Client | Oui |
| QuoteRevisionModal / RequestRevisionPage | quote_revision_requested | Artisan | Oui |
| QuoteRevisionResponseModal / RevisionResponsePage | system (revision_responded) | Client | Oui |
| ProjectWorkPage / ProjectDetailsPage | project_completed | Client | Oui |
| useEscrow / ProjectCompletionPage / AdminClosures / AdminEscrows | payment_received | Artisan | Oui |
| ChatPage | new_message | Participant | Oui |
| AdminDisputes | dispute_raised / system | Client/Artisan | Oui |
| AdminVerifications | verification_approved / verification_rejected | Artisan | Oui |
| RatingModal | (notification métier) | Artisan | Oui |

Toutes ces actions passent par un `INSERT` dans `notifications` et sont donc reçues en temps réel par le hook `useNotifications` lorsque Realtime est activé sur la table.
