# LinkZip Firebase Functions

## Marketplace seller settlement gate

Private-beta seller types:

- `individual_creator`: may apply without a business registration number. LinkZip checkout is limited to digital files such as PDFs; physical goods require an external purchase URL until the seller converts to a business seller.
- `business`: may apply for digital and physical-product checkout after business, mail-order-sales, and payout-account review.

Individual creator approval is not a legal safe harbor for ongoing commercial sales. The application records acknowledgement that recurring or continuous profit-seeking sales require business registration and that the seller remains responsible for tax reporting, refunds, and disputes.

Store and profile-product Toss payments remain disabled until the payment contract supports platform/merchant settlement. Enable them only after Toss Payments confirms the contract and seller-by-seller settlement flow:

```text
platformSettings/payment.marketplaceSellerSettlementEnabled = true
```

Manual seller approval is required per user. An approved seller can use a verified seller-owned bank account; this is not LinkZip holding and redistributing sale proceeds. Toss checkout remains disabled until the marketplace payout/KYC contract is confirmed and the flag above is enabled. Unapproved sellers are limited to external purchase links.

## Meta Instagram webhook

The `metaInstagramWebhook` HTTPS function provides:

- Meta webhook GET challenge verification
- `X-Hub-Signature-256` validation for POST deliveries
- idempotent storage of signed events in `metaInstagramWebhookEvents`
- a 30-day `expiresAt` field for a Firestore TTL policy

Configure both secrets before the first deployment:

```bash
npx --yes firebase-tools functions:secrets:set META_WEBHOOK_VERIFY_TOKEN --project profilelinks-d81ec
npx --yes firebase-tools functions:secrets:set META_APP_SECRET --project profilelinks-d81ec
```

Build and test locally:

```bash
npm test --prefix functions
```

After deployment, Meta can use either the direct function URL:

```text
https://asia-northeast3-profilelinks-d81ec.cloudfunctions.net/metaInstagramWebhook
```

or the Hosting rewrite after both Functions and Hosting are deployed:

```text
https://linkzip.kr/api/meta/instagram/webhook
```

Enable a Firestore TTL policy for the `expiresAt` field on the
`metaInstagramWebhookEvents` collection before accepting production traffic.

## Instagram Login OAuth

Keep the Meta app secret used for webhook signature validation separate from
the Instagram Login credentials. Copy the App ID and App Secret shown together
under **Instagram > API setup with Instagram login** into these secrets:

```bash
npx --yes firebase-tools functions:secrets:set META_INSTAGRAM_APP_ID --project profilelinks-d81ec
npx --yes firebase-tools functions:secrets:set META_INSTAGRAM_APP_SECRET --project profilelinks-d81ec
```

The valid OAuth redirect URI must match exactly:

```text
https://linkzip.kr/auth/instagram/callback
```
