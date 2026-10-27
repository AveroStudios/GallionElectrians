# Galliano Electrical: Cloudflare version

Static site in `public/` plus a Worker (`worker.js`) that handles the quote form at `/api/quote`.

## Deploy
    npm install
    npx wrangler login
    npx wrangler secret put RESEND_API_KEY
    npx wrangler secret put QUOTE_TO_EMAIL
    npx wrangler secret put QUOTE_FROM_EMAIL    # sender on a domain verified in Resend
    npm run deploy

`npm run deploy` first regenerates `public/_headers` (CSP hashes), then deploys. Run `npm run headers` whenever you edit `public/index.html`.
Custom domain: Cloudflare dashboard > Workers & Pages > galliano-electrical > Settings > Domains.

## Local
Copy `.dev.vars.example` to `.dev.vars`, then `npm run dev`. Tests: `npm test`.

## Still to do
- Rate limiting: add a Cloudflare WAF rate-limiting rule for `/api/quote` (Security > WAF > Rate limiting rules), e.g. 5 requests per 10 minutes per IP. The Worker has no counter of its own.
- Replace `[Owner:` and `Placeholder` text in `public/index.html`; add a privacy page (POPIA), canonical URL, sitemap.
