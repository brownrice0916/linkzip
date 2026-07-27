import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import test from "node:test";

import {
  buildReplyText,
  decryptSecret,
  encryptSecret,
  extractInstagramInboundEvents,
  matchingRule,
  normalizeAutomationRules,
} from "./instagramAutomation.js";

test("normalizes and matches an active keyword rule", () => {
  const rules = normalizeAutomationRules([{
    id: "one",
    keyword: "링크",
    responseMessage: "보내드릴게요",
    targetLinkUrl: "https://linkzip.kr/grain",
    isActive: true,
  }]);
  const matched = matchingRule(rules, "링크 부탁해요");
  assert.equal(matched?.id, "one");
  assert.equal(buildReplyText(matched!), "보내드릴게요\nhttps://linkzip.kr/grain");
});

test("extracts message and comment webhook events", () => {
  const events = extractInstagramInboundEvents({
    entry: [{
      id: "business-id",
      messaging: [{
        sender: {id: "sender-id"},
        recipient: {id: "business-id"},
        message: {mid: "message-id", text: "링크"},
      }],
      changes: [{
        field: "comments",
        value: {id: "comment-id", text: "구매", from: {id: "commenter-id"}},
      }],
    }],
  });
  assert.deepEqual(events.map((event) => event.kind), ["message", "comment"]);
  assert.equal(events[1].commentId, "comment-id");
});

test("encrypts and decrypts an access token", () => {
  const key = randomBytes(32).toString("base64");
  const encrypted = encryptSecret("secret-access-token", key);
  assert.notEqual(encrypted.ciphertext, "secret-access-token");
  assert.equal(decryptSecret(encrypted, key), "secret-access-token");
});
