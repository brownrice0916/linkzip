import assert from "node:assert/strict";
import test from "node:test";
import {generateInviteCode, inviteCodeId, isSiteAdmin, normalizeInviteCode} from "./betaAccess.js";

test("초대코드를 대문자와 공백 제거 형식으로 정규화한다", () => {
  assert.equal(normalizeInviteCode("  lz-ab cd-123  "), "LZ-ABCD-123");
});

test("같은 초대코드는 같은 문서 ID를 만든다", () => {
  assert.equal(inviteCodeId("lz-abc"), inviteCodeId(" LZ-ABC "));
});

test("생성 코드는 사람이 옮겨 적기 쉬운 형식이다", () => {
  assert.match(generateInviteCode(), /^LZ-[A-F0-9]{5}-[A-F0-9]{5}$/);
});

test("검증된 운영자 이메일 또는 커스텀 클레임만 관리자로 인정한다", () => {
  assert.equal(isSiteAdmin({email: "brownrice0916@gmail.com", email_verified: true}), true);
  assert.equal(isSiteAdmin({email: "brownrice0916@gmail.com", email_verified: false}), false);
  assert.equal(isSiteAdmin({siteAdmin: true}), true);
});
