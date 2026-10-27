// Writes public/_headers with a CSP whose hashes match the inline script/style in index.html.
// Re-run (npm run headers) after editing index.html.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const html = readFileSync("public/index.html", "utf8");
const h = re => [...html.matchAll(re)].map(m => `'sha256-${createHash("sha256").update(m[1]).digest("base64")}'`).join(" ");
const csp = ["default-src 'self'", "script-src 'self' " + h(/<script(?:(?!src)[^>])*>([\s\S]*?)<\/script>/g),
  "style-src 'self' https://fonts.googleapis.com " + h(/<style>([\s\S]*?)<\/style>/g), "font-src https://fonts.gstatic.com",
  "img-src 'self' data:", "connect-src 'self'", "frame-ancestors 'none'", "base-uri 'none'", "form-action 'self'"].join("; ");
writeFileSync("public/_headers", `/*\n  Content-Security-Policy: ${csp}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Strict-Transport-Security: max-age=31536000\n`);
console.log("wrote public/_headers");
