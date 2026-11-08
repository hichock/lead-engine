import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { decrypt, encrypt } from "./crypto";

test("encrypt/decrypt round trip, and a wrong key fails loudly", () => {
  const k = randomBytes(32);
  const enc = encrypt("abcd efgh ijkl mnop", k);
  assert.notEqual(enc, "abcd efgh ijkl mnop");
  assert.equal(decrypt(enc, k), "abcd efgh ijkl mnop");
  assert.throws(() => decrypt(enc, randomBytes(32)));
});
