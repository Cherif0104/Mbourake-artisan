# Workflow escrow et paiements

## Étapes du paiement (bout en bout)

1. **Devis accepté**  
   Le client accepte un devis → le projet passe en statut adapté (quote_accepted / payment_pending).

2. **Séquestration (escrow)**  
   Le client paie → le montant est **séquestré** (escrow créé, statut `held` ou `advance_paid`).  
   L’artisan voit « Client a payé – En attente versement plateforme ».

3. **Prestation et clôture**  
   Travaux réalisés → le client confirme la fin (clôture) → le projet passe en `completed`.  
   Le **super administrateur / administrateur** de la plateforme doit alors **valider le déblocage** des fonds.

4. **Déblocage en cours**  
   L’admin procède au déblocage (escrow → `released`) après déduction des **commissions** et frais.  
   Un workflow de **notification** doit indiquer : *« Projet terminé et confirmé par le client ; le paiement vers l’artisan (hors commission) va être effectué / a été débloqué. »*

5. **Litige**  
   En cas de litige, l’escrow peut être gelé (`frozen`).  
   Le **super administrateur** doit être **notifié** pour prendre en charge la situation (résolution, remboursement, etc.).

## Notions à refléter dans l’app

- **Côté client (Mes factures / Paiements effectués)**  
  Tous les paiements effectués (escrow par projet) : montant garanti, statut (séquestré, déblocage en cours, déblocage effectué, litige).

- **Côté artisan (Mes factures / Paiements reçus)**  
  Tous les paiements reçus : coût prestation, commission déduite, net versé, avec solde (mensuel / annuel) à jour.

- **Vue bout en bout**  
  Les modules **Mes factures** et **Mes dépenses** (ou Finances) doivent refléter en temps réel : projets, montants, solde, et statut de chaque étape (séquestration → déblocage admin → versement artisan).

## Implémentation actuelle

- **Escrow** : table `escrows` (project_id, total_amount, artisan_payout, status : pending, held, advance_paid, released, frozen, refunded).
- **Pages** : InvoicesPage affiche côté client « Paiements effectués » et côté artisan « Paiements reçus » à partir des escrows.
- **Notifications** : `payment_received` notifie l’artisan ; à compléter côté admin (notification « déblocage à valider », « litige à traiter ») selon les besoins métier.
