# LinkZip Firebase Functions

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
