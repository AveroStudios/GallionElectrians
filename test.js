"use strict";
const assert = require("assert"), { validate, server } = require("./server");
const ok = { name: "A", phone: "0742220712", email: "", contact: "Phone call", service: "Lighting", type: "Residential", location: "X", details: "Y", consent: true, website: "" };
assert(validate(ok)); assert.strictEqual(validate({ ...ok, phone: "abc" }), null);
assert.strictEqual(validate({ ...ok, consent: false }), null); assert.strictEqual(validate({ ...ok, service: "Hack" }), null);
assert.strictEqual(validate({ ...ok, name: "a".repeat(81) }), null); assert.strictEqual(validate({ ...ok, name: "a\nb" }), null);
assert.strictEqual(validate({ ...ok, website: "spam" }), "bot");
server.listen(0, async () => {
  const base = "http://127.0.0.1:" + server.address().port;
  const post = b => fetch(base + "/api/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });
  assert.strictEqual((await post({ x: 1 })).status, 400);
  assert.strictEqual((await post(ok)).status, 503); // email not configured: must NOT claim success
  assert.strictEqual((await fetch(base + "/../server.js")).status, 404);
  assert.strictEqual((await fetch(base + "/")).status, 200);
  assert.strictEqual((await fetch(base + "/api/quote", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "x" })).status, 415);
  console.log("All tests passed"); server.close(); process.exit(0);
});
