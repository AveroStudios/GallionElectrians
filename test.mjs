import assert from "node:assert";
import worker, { validate } from "./worker.js";
const ok = { name: "A", phone: "0742220712", email: "", contact: "Phone call", service: "Lighting", type: "Residential", location: "X", details: "Y", consent: true, website: "" };
assert(validate(ok)); assert.strictEqual(validate({ ...ok, phone: "abc" }), null); assert.strictEqual(validate({ ...ok, consent: false }), null);
assert.strictEqual(validate({ ...ok, service: "Hack" }), null); assert.strictEqual(validate({ ...ok, name: "a\nb" }), null);
assert.strictEqual(validate({ ...ok, website: "x" }), "bot");
const env = { ASSETS: { fetch: async () => new Response("asset") } };
const post = (b, env2 = env, ct = "application/json") => worker.fetch(new Request("https://x.test/api/quote", { method: "POST", headers: { "Content-Type": ct }, body: typeof b === "string" ? b : JSON.stringify(b) }), env2);
assert.strictEqual((await post({ x: 1 })).status, 400);
assert.strictEqual((await post("{bad")).status, 400);
assert.strictEqual((await post(ok)).status, 503); // no email secrets: must not claim success
assert.strictEqual((await post("x", env, "text/plain")).status, 415);
assert.strictEqual((await worker.fetch(new Request("https://x.test/api/quote"), env)).status, 405);
assert.strictEqual(await (await worker.fetch(new Request("https://x.test/"), env)).text(), "asset");
// success path with mocked Resend
const real = globalThis.fetch; globalThis.fetch = async () => new Response("{}", { status: 200 });
assert.strictEqual((await post(ok, { ...env, RESEND_API_KEY: "k", QUOTE_TO_EMAIL: "a@b.co", QUOTE_FROM_EMAIL: "c@d.co" })).status, 200);
globalThis.fetch = async () => new Response("{}", { status: 500 });
assert.strictEqual((await post(ok, { ...env, RESEND_API_KEY: "k", QUOTE_TO_EMAIL: "a@b.co", QUOTE_FROM_EMAIL: "c@d.co" })).status, 503);
globalThis.fetch = real; console.log("All tests passed");
