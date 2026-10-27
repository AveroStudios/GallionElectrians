"use strict";
// Dependency-free Node 18+ server: serves /public and accepts POST /api/quote.
const http = require("http"), fs = require("fs"), path = require("path"), crypto = require("crypto");
const PORT = Number(process.env.PORT || 3000);
const { RESEND_API_KEY, QUOTE_TO_EMAIL, QUOTE_FROM_EMAIL } = process.env;
const PUB = path.join(__dirname, "public");
const html = fs.readFileSync(path.join(PUB, "index.html"), "utf8");
const hashes = (re) => [...html.matchAll(re)].map(m => "'sha256-" + crypto.createHash("sha256").update(m[1]).digest("base64") + "'").join(" ");
const CSP = ["default-src 'self'", "script-src 'self' " + hashes(/<script(?:(?!src)[^>])*>([\s\S]*?)<\/script>/g),
  "style-src 'self' https://fonts.googleapis.com " + hashes(/<style>([\s\S]*?)<\/style>/g), "font-src https://fonts.gstatic.com",
  "img-src 'self' data:", "connect-src 'self'", "frame-ancestors 'none'", "base-uri 'none'", "form-action 'self'"].join("; ");
const SEC = { "Content-Security-Policy": CSP, "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()", "Strict-Transport-Security": "max-age=31536000" };
const LIM = { name: 80, phone: 20, email: 120, contact: 20, service: 60, type: 20, location: 120, details: 1500 };
const ENUM = { contact: ["Phone call", "WhatsApp", "Email"], type: ["Residential", "Commercial", "Industrial"],
  service: ["Repairs and fault finding", "Electrical installations", "Distribution boards", "Lighting", "Emergency call-out", "Other"] };
const hits = new Map(); // in-memory limiter: use a shared store (e.g. Redis) if you run multiple instances
function limited(ip) { const n = Date.now(), a = (hits.get(ip) || []).filter(t => n - t < 600000); a.push(n); hits.set(ip, a); return a.length > 5; }
function validate(b) {
  if (!b || typeof b !== "object" || Array.isArray(b)) return null;
  if (b.website) return "bot";
  const o = {};
  for (const k of Object.keys(LIM)) {
    const v = typeof b[k] === "string" ? b[k].trim() : "";
    if (v.length > LIM[k] || /[\r\n]/.test(v) && k !== "details") return null;
    if (!v && k !== "email") return null;
    o[k] = v;
  }
  for (const k of Object.keys(ENUM)) if (!ENUM[k].includes(o[k])) return null;
  if (!/^[0-9+()\s-]{9,20}$/.test(o.phone)) return null;
  if (o.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(o.email)) return null;
  if (b.consent !== true) return null;
  return o;
}
const esc = s => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
async function sendMail(o) {
  if (!RESEND_API_KEY || !QUOTE_TO_EMAIL || !QUOTE_FROM_EMAIL) throw new Error("email not configured");
  const rows = Object.entries(o).map(([k, v]) => `<p><b>${esc(k)}:</b> ${esc(v)}</p>`).join("");
  const r = await fetch("https://api.resend.com/emails", { method: "POST",
    headers: { Authorization: "Bearer " + RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ from: QUOTE_FROM_EMAIL, to: [QUOTE_TO_EMAIL], subject: "New quote request: " + o.service.replace(/[\r\n]/g, " "), html: rows }) });
  if (!r.ok) throw new Error("provider status " + r.status);
}
function json(res, code, obj) { res.writeHead(code, { ...SEC, "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(JSON.stringify(obj)); }
const MIME = { ".html": "text/html; charset=utf-8", ".txt": "text/plain", ".xml": "application/xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/api/quote") {
    if (req.method !== "POST") return json(res, 405, { ok: false, error: "Method not allowed." });
    if (!/^application\/json/.test(req.headers["content-type"] || "")) return json(res, 415, { ok: false, error: "Unsupported content type." });
    const ip = req.socket.remoteAddress || "?";
    if (limited(ip)) return json(res, 429, { ok: false, error: "Too many requests. Please try again later." });
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > 10000) { json(res, 413, { ok: false, error: "Request too large." }); req.destroy(); } else chunks.push(c); });
    req.on("end", async () => {
      if (res.writableEnded) return;
      let b; try { b = JSON.parse(Buffer.concat(chunks).toString()); } catch { return json(res, 400, { ok: false, error: "Invalid request." }); }
      const o = validate(b);
      if (o === "bot") return json(res, 200, { ok: true }); // silently drop bots
      if (!o) return json(res, 400, { ok: false, error: "Please check your details and try again." });
      try { await sendMail(o); json(res, 200, { ok: true }); }
      catch (e) { console.error(JSON.stringify({ evt: "mail_fail", msg: e.message })); json(res, 503, { ok: false, error: "We could not deliver your request." }); }
    });
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405, SEC); return res.end(); }
  const rel = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const file = path.resolve(PUB, rel);
  if (!file.startsWith(PUB + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404, SEC); return res.end("Not found"); }
  res.writeHead(200, { ...SEC, "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
if (require.main === module) server.listen(PORT, () => console.log("Listening on " + PORT));
module.exports = { validate, server };
