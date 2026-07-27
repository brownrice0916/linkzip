import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import test from "node:test";

import {
  verifyMetaSignature,
  verifyWebhookChallenge,
  webhookEventId,
} from "./metaWebhook.js";

test("accepts a valid Meta webhook challenge", () => {
  const result = verifyWebhookChallenge(
    {
      "hub.mode": "subscribe",
      "hub.verify_token": "verify-token",
      "hub.challenge": "123456",
    },
    "verify-token",
  );

  assert.deepEqual(result, {ok: true, challenge: "123456"});
});

test("rejects a webhook challenge with the wrong token", () => {
  const result = verifyWebhookChallenge(
    {
      "hub.mode": "subscribe",
      "hub.verify_token": "wrong-token",
      "hub.challenge": "123456",
    },
    "verify-token",
  );

  assert.deepEqual(result, {
    ok: false,
    status: 403,
    message: "Invalid verify token",
  });
});

test("verifies a signed Meta request body", () => {
  const body = Buffer.from(JSON.stringify({object: "instagram", entry: []}));
  const secret = "app-secret";
  const signature = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

  assert.equal(verifyMetaSignature(body, signature, secret), true);
  assert.equal(verifyMetaSignature(body, signature, "wrong-secret"), false);
});

test("creates stable identifiers for webhook retries", () => {
  const body = Buffer.from("same event");
  assert.equal(webhookEventId(body), webhookEventId(body));
  assert.notEqual(webhookEventId(body), webhookEventId(Buffer.from("other event")));
});
