import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import test from "node:test";

import {
  parseSignedRequest,
  verifyMetaSignature,
  verifyWebhookChallenge,
  webhookEventId,
} from "./metaWebhook.js";

const base64Url = (value: Buffer | string) =>
  (typeof value === "string" ? Buffer.from(value) : value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const signedRequestFor = (payload: unknown, secret: string) => {
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(encodedPayload).digest();
  return `${base64Url(signature)}.${encodedPayload}`;
};

test("accepts a deauthorize ping signed with either app secret", () => {
  const payload = {algorithm: "HMAC-SHA256", user_id: "17841400000000000"};
  assert.equal(
    parseSignedRequest(signedRequestFor(payload, "fb-secret"), ["fb-secret", "ig-secret"])?.user_id,
    "17841400000000000",
  );
  assert.equal(
    parseSignedRequest(signedRequestFor(payload, "ig-secret"), ["fb-secret", "ig-secret"])?.user_id,
    "17841400000000000",
  );
});

test("rejects deauthorize pings that are forged or malformed", () => {
  const payload = {algorithm: "HMAC-SHA256", user_id: "17841400000000000"};
  // Signed with a secret we do not hold.
  assert.equal(parseSignedRequest(signedRequestFor(payload, "attacker"), ["fb-secret"]), null);
  // Payload swapped after signing.
  const [signature] = signedRequestFor(payload, "fb-secret").split(".");
  const tampered = `${signature}.${base64Url(JSON.stringify({...payload, user_id: "999"}))}`;
  assert.equal(parseSignedRequest(tampered, ["fb-secret"]), null);
  // A payload claiming an algorithm we do not verify.
  assert.equal(
    parseSignedRequest(signedRequestFor({...payload, algorithm: "none"}, "fb-secret"), ["fb-secret"]),
    null,
  );
  assert.equal(parseSignedRequest(undefined, ["fb-secret"]), null);
  assert.equal(parseSignedRequest("not-a-signed-request", ["fb-secret"]), null);
  assert.equal(parseSignedRequest(signedRequestFor(payload, ""), [""]), null);
});

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
