// Cloudflare Worker: handles POST /api/quote; everything else is served from ./public by the assets binding.
const LIM = { name: 80, phone: 20, email: 120, contact: 20, service: 60, type: 20, location: 120, details: 1500 };
const ENUM = { contact: ["Phone call", "WhatsApp", "Email"], type: ["Residential", "Commercial", "Industrial"],
  service: ["Repairs and fault finding", "Electrical installations", "Distribution boards", "Lighting", "Emergency call-out", "Other"] };
const H = { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const json = (code, obj) => new Response(JSON.stringify(obj), { status: code, headers: H });
const esc = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function validate(b) {
  if (!b || typeof b !== "object" || Array.isArray(b)) return null;
  if (b.website) return "bot";
  const o = {};
  for (const k of Object.keys(LIM)) {
    const v = typeof b[k] === "string" ? b[k].trim() : "";
    if (v.length > LIM[k] || (/[\r\n]/.test(v) && k !== "details")) return null;
    if (!v && k !== "email") return null;
    o[k] = v;
  }
  for (const k of Object.keys(ENUM)) if (!ENUM[k].includes(o[k])) return null;
  if (!/^[0-9+()\s-]{9,20}$/.test(o.phone)) return null;
  if (o.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) return null;
  if (b.consent !== true) return null;
  return o;
}

async function sendMail(o, env) {
  if (!env.RESEND_API_KEY || !env.QUOTE_TO_EMAIL || !env.QUOTE_FROM_EMAIL) throw new Error("email not configured");
  const rows = Object.entries(o).map(([k, v]) => `<p><b>${esc(k)}:</b> ${esc(v)}</p>`).join("");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.QUOTE_FROM_EMAIL, to: [env.QUOTE_TO_EMAIL], subject: "New quote request: " + o.service, html: rows }),
  });
  if (!r.ok) throw new Error("provider status " + r.status);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname !== "/api/quote") return env.ASSETS.fetch(req);
    if (req.method !== "POST") return json(405, { ok: false, error: "Method not allowed." });
    if (!(req.headers.get("content-type") || "").startsWith("application/json")) return json(415, { ok: false, error: "Unsupported content type." });
    const text = await req.text();
    if (text.length > 10000) return json(413, { ok: false, error: "Request too large." });
    let b; try { b = JSON.parse(text); } catch { return json(400, { ok: false, error: "Invalid request." }); }
    const o = validate(b);
    if (o === "bot") return json(200, { ok: true });
    if (!o) return json(400, { ok: false, error: "Please check your details and try again." });
    try { await sendMail(o, env); return json(200, { ok: true }); }
    catch (e) { console.error(JSON.stringify({ evt: "mail_fail", msg: e.message })); return json(503, { ok: false, error: "We could not deliver your request." }); }
  },
};
