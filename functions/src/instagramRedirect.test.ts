import assert from "node:assert/strict";
import test from "node:test";

import {
  INSTAGRAM_PRODUCTION_ORIGIN,
  instagramReturnOrigin,
} from "./instagramRedirect.js";

test("keeps production and loopback origins", () => {
  assert.equal(instagramReturnOrigin("https://linkzip.kr"), "https://linkzip.kr");
  assert.equal(instagramReturnOrigin("http://localhost:5173"), "http://localhost:5173");
  assert.equal(instagramReturnOrigin("http://127.0.0.1:5173"), "http://127.0.0.1:5173");
});

test("falls back to production for anything else", () => {
  const rejected = [
    // Someone else's host, which would receive the authorization code.
    "https://evil.example",
    // Lookalike hostnames that merely contain the allowed ones.
    "https://linkzip.kr.evil.example",
    "http://localhost.evil.example",
    "http://evil.example/#localhost",
    // Loopback over https or a non-http scheme is not something we serve.
    "https://localhost:5173",
    "javascript:alert(1)",
    // Anything beyond a bare origin: the callback appends its own path.
    "http://localhost:5173/admin/marketing",
    "http://localhost:5173?next=https://evil.example",
    "http://localhost:5173/",
    // Missing or malformed values.
    "",
    "not a url",
    "//localhost:5173",
    undefined,
    null,
    42,
    {origin: "http://localhost:5173"},
  ];

  for (const value of rejected) {
    assert.equal(
      instagramReturnOrigin(value),
      INSTAGRAM_PRODUCTION_ORIGIN,
      `expected ${JSON.stringify(value)} to be rejected`,
    );
  }
});
