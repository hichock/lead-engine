import { test } from "node:test";
import assert from "node:assert/strict";
import { apexOf, hostOf, isDomain } from "./domain";

test("host and apex", () => {
  assert.equal(hostOf("https://www.Portal.Acme.co.uk/x?y"), "portal.acme.co.uk");
  assert.equal(apexOf("https://www.Portal.Acme.co.uk/x?y"), "acme.co.uk");
  assert.equal(apexOf("app.example.com"), "example.com");
  assert.equal(apexOf("example.com"), "example.com");
  assert.equal(isDomain("acme.example"), true);
  assert.equal(isDomain("not a domain"), false);
});
