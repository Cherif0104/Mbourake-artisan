# Edge Function : initiate-intouch-payment

Point d'entrée pour déclencher un paiement via un agrégateur (InTouch, PayTech, etc.) supportant Wave et Orange Money au Sénégal.

## Comportement

- **Sans configuration** : la fonction renvoie un paiement simulé (stub) pour les tests.
- **Avec configuration** : si les variables d'environnement sont définies, la fonction appelle l'API réelle du partenaire.

## Variables d'environnement Supabase

À configurer dans le dashboard Supabase (Settings > Edge Functions > Secrets) ou via CLI :

| Variable | Description |
|----------|-------------|
| `INTOUCH_API_KEY` | Clé API du partenaire (InTouch, PayTech, etc.) |
| `INTOUCH_BASE_URL` | URL de base de l'API (ex. `https://api.partenaire.sn`) |

Optionnel (si le partenaire notifie les paiements de façon asynchrone) :

| Variable | Description |
|----------|-------------|
| `INTOUCH_WEBHOOK_SECRET` | Secret pour vérifier la signature des webhooks |

## Payload d'entrée (POST)

Le front envoie un body JSON :

```json
{
  "amount": 15000,
  "methodId": "wave",
  "metadata": {
    "projectId": "uuid",
    "escrowId": "uuid",
    "userId": "uuid",
    "phoneNumber": "221771234567"
  }
}
```

- `amount` (number) : montant en FCFA.
- `methodId` (string) : `wave`, `orange_money`, `free_money`, etc.
- `metadata` (optionnel) : contexte (projet, escrow, téléphone client pour le paiement mobile).

## Réponse

La fonction renvoie un objet `EdgePaymentResult` :

- `success` (boolean)
- `transactionId` (string)
- `reference` (string)
- `timestamp` (string ISO)
- `amount`, `fees`, `totalCharged` (number)
- `method` (string)
- `status` : `completed` | `pending` | `failed`
- `message` (string)

## Webhooks (optionnel)

Si l'agrégateur notifie les paiements via webhook :

1. Créer une Edge Function dédiée (ex. `payment-webhook`) avec une route POST.
2. Vérifier la signature avec `INTOUCH_WEBHOOK_SECRET`.
3. Mettre à jour l'escrow / le projet en fonction du statut reçu.
4. Configurer l'URL du webhook dans le dashboard du partenaire.

## Désactiver le mode simulation (front)

En production, définir `VITE_PAYMENT_BYPASS=false` (ou équivalent) pour que le front appelle cette Edge Function au lieu du mode bypass local.

## Déploiement

```bash
supabase functions deploy initiate-intouch-payment
```

Puis configurer les secrets :

```bash
supabase secrets set INTOUCH_API_KEY=xxx INTOUCH_BASE_URL=https://...
```
