import assert from "node:assert/strict";
import test from "node:test";
import {Timestamp} from "firebase-admin/firestore";

import {
  BETA_LIFETIME_PREMIUM_GRANT,
  BETA_SHARED_FILE_BYTES,
  BETA_SHARED_FILE_DOWNLOADS_PER_DAY,
  BETA_SHARED_FILE_OWNER_DOWNLOADS_PER_DAY,
  BETA_SHARED_FILE_UPLOAD_BYTES_PER_DAY,
  PLAN_ENTITLEMENTS,
  resolveActiveMembershipPlan,
  sharedFileBytesForUser,
  sharedFileDownloadsPerDayForUser,
} from "./planEntitlements.js";

test("server plan limits match the paid product policy", () => {
  assert.equal(PLAN_ENTITLEMENTS.basic.maxProfiles, 1);
  assert.equal(PLAN_ENTITLEMENTS.standard.maxProfiles, 3);
  assert.equal(PLAN_ENTITLEMENTS.premium.maxProfiles, 5);
  assert.equal(PLAN_ENTITLEMENTS.basic.maxBlocksPerProfile, null);
  assert.equal(PLAN_ENTITLEMENTS.standard.maxBlocksPerProfile, null);
  assert.equal(PLAN_ENTITLEMENTS.premium.maxBlocksPerProfile, null);
  assert.equal(PLAN_ENTITLEMENTS.basic.maxProductsPerProfile, null);
  assert.equal(PLAN_ENTITLEMENTS.standard.maxProductsPerProfile, null);
  assert.equal(PLAN_ENTITLEMENTS.premium.maxProductsPerProfile, null);
  assert.equal(PLAN_ENTITLEMENTS.basic.maxInstagramRules, null);
  assert.equal(PLAN_ENTITLEMENTS.standard.maxInstagramRules, null);
  assert.equal(PLAN_ENTITLEMENTS.premium.maxInstagramRules, null);
  assert.equal(PLAN_ENTITLEMENTS.basic.maxInstagramDeliveriesPerMonth, null);
  assert.equal(PLAN_ENTITLEMENTS.basic.salesFeePercent, 5);
  assert.equal(PLAN_ENTITLEMENTS.standard.salesFeePercent, 2);
  assert.equal(PLAN_ENTITLEMENTS.premium.salesFeePercent, 0);
  assert.equal(PLAN_ENTITLEMENTS.basic.canUseAnimatedStickers, false);
  assert.equal(PLAN_ENTITLEMENTS.standard.canUseAnimatedStickers, true);
  assert.equal(PLAN_ENTITLEMENTS.premium.canUseAnimatedStickers, true);
  assert.equal(PLAN_ENTITLEMENTS.basic.maxPageStickers, 10);
  assert.equal(PLAN_ENTITLEMENTS.basic.maxAnimatedStickers, 0);
  assert.equal(PLAN_ENTITLEMENTS.standard.maxPageStickers, 10);
  assert.equal(PLAN_ENTITLEMENTS.standard.maxAnimatedStickers, 3);
  assert.equal(PLAN_ENTITLEMENTS.premium.maxPageStickers, 15);
  assert.equal(PLAN_ENTITLEMENTS.premium.maxAnimatedStickers, 5);
});

test("server rejects expired memberships", () => {
  const now = Date.parse("2026-07-29T00:00:00.000Z");
  assert.equal(resolveActiveMembershipPlan({
    membershipPlan: "standard",
    membershipPeriodEndsAt: Timestamp.fromDate(new Date("2026-07-30T00:00:00.000Z")),
  }, now), "standard");
  assert.equal(resolveActiveMembershipPlan({
    membershipPlan: "standard",
    membershipPeriodEndsAt: Timestamp.fromDate(new Date("2026-07-28T00:00:00.000Z")),
  }, now), "basic");
});

test("server keeps beta lifetime premium active without an end date", () => {
  assert.equal(resolveActiveMembershipPlan({
    membershipPlan: "premium",
    membershipPeriodEndsAt: null,
    membershipGrant: BETA_LIFETIME_PREMIUM_GRANT,
  }), "premium");
  assert.equal(resolveActiveMembershipPlan({
    membershipPlan: "basic",
    membershipPeriodEndsAt: Timestamp.fromDate(new Date("2020-01-01T00:00:00.000Z")),
    membershipGrant: BETA_LIFETIME_PREMIUM_GRANT,
  }), "premium");
});

test("beta lifetime premium uses a cost-controlled daily shared-file quota", () => {
  const betaUser = {
    membershipPlan: "premium",
    membershipGrant: BETA_LIFETIME_PREMIUM_GRANT,
  };
  assert.equal(BETA_SHARED_FILE_UPLOAD_BYTES_PER_DAY, 100 * 1024 * 1024);
  assert.equal(BETA_SHARED_FILE_DOWNLOADS_PER_DAY, 10);
  assert.equal(BETA_SHARED_FILE_OWNER_DOWNLOADS_PER_DAY, 100);
  assert.equal(sharedFileDownloadsPerDayForUser(betaUser), 10);
  assert.equal(sharedFileDownloadsPerDayForUser({
    membershipPlan: "premium",
    membershipPeriodEndsAt: Timestamp.fromDate(new Date("2099-01-01T00:00:00.000Z")),
  }), 500);
});

test("beta lifetime premium caps per-file upload size below the premium plan", () => {
  assert.equal(BETA_SHARED_FILE_BYTES, 10 * 1024 * 1024);
  assert.equal(sharedFileBytesForUser({
    membershipPlan: "premium",
    membershipGrant: BETA_LIFETIME_PREMIUM_GRANT,
  }), 10 * 1024 * 1024);
  assert.equal(sharedFileBytesForUser({
    membershipPlan: "premium",
    membershipPeriodEndsAt: Timestamp.fromDate(new Date("2099-01-01T00:00:00.000Z")),
  }), 100 * 1024 * 1024);
  assert.equal(sharedFileBytesForUser({membershipPlan: "basic"}), 5 * 1024 * 1024);
});
