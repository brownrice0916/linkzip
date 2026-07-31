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

test("keeps a next-post rule pending until a post is assigned", () => {
  const rules = normalizeAutomationRules([{
    id: "next-post",
    keyword: "구매",
    responseMessage: "보내드릴게요",
    targetLinkUrl: "https://linkzip.kr/grain",
    targetMode: "next",
    excludedPostIds: ["old-post"],
    isActive: true,
  }]);
  assert.equal(rules[0].targetMode, "next");
  assert.deepEqual(rules[0].excludedPostIds, ["old-post"]);
  assert.equal(matchingRule(rules, "구매", "new-post"), undefined);
});

test("applies post targeting to comments but not direct messages", () => {
  const rules = normalizeAutomationRules([{
    id: "selected-post",
    keyword: "*",
    responseMessage: "안녕하세요",
    postIds: ["selected-post-id"],
    applyToAllPosts: false,
    isActive: true,
  }]);

  assert.equal(matchingRule(rules, "테스트", undefined, "message")?.id, "selected-post");
  assert.equal(matchingRule(rules, "테스트", "other-post-id", "comment"), undefined);
  assert.equal(matchingRule(rules, "테스트", "selected-post-id", "comment")?.id, "selected-post");
});

test("accepts long signed Instagram thumbnail URLs", () => {
  const signedThumbnailUrl = `https://scontent.cdninstagram.com/image.jpg?signature=${"a".repeat(1200)}`;
  const rules = normalizeAutomationRules([{
    id: "long-thumbnail",
    keyword: "구매",
    responseMessage: "보내드릴게요",
    targetLinkUrl: "https://linkzip.kr/grain",
    postThumbnailUrl: signedThumbnailUrl,
    isActive: true,
  }]);

  assert.equal(rules[0].postThumbnailUrl, signedThumbnailUrl);
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
