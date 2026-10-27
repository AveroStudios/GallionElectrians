# Galliano Electrical website

Static site (`public/index.html`) plus a dependency-free Node 18+ server (`server.js`) that handles the quote form.

## Run
    cp .env.example .env     # then fill in values
    export $(grep -v '^#' .env | xargs)
    npm start                # http://localhost:3000
    npm test

## Configure
- Phone/WhatsApp: edit `PHONE_INTL` in the script at the bottom of `public/index.html` (and the `tel:` links, which are all `tel:+27742220712`).
- Quote emails use Resend (resend.com): set `RESEND_API_KEY`, `QUOTE_TO_EMAIL`, `QUOTE_FROM_EMAIL` (verified sender domain). Until set, the form shows an honest error and offers call/WhatsApp. It never shows success without delivery.
- Search the file for `[Owner:` and `Placeholder` and replace with real details (service areas, compliance info, payment terms, project photos).
- Add `<link rel="canonical">` and a sitemap.xml once your domain is known.
- Add a privacy policy page (POPIA) and link it in the footer before launch.

## Deploy
Any Node host behind HTTPS (Render, Railway, a VPS). Update the CSP hashes automatically: they are computed at startup from the inline script/style. The rate limiter is in-memory: use a shared store if you run more than one instance.
