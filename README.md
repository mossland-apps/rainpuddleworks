# Rainpuddle Website Rescue

Marketing site for rainpuddleworks.com, built with Astro as a static site.

## Pages

- `/` Website Rescue ($349 fixed-price repair)
- `/about/` About Rainpuddle: services, differences, founder, how it works, key facts, FAQ
- `/services/` Rescue, Rebuild, and Custom Web Development
- `/website-rebuild/` Website Rebuild (from $1,495)
- `/privacy/` Privacy note

Prices live in `src/lib/pricing.ts`; page copy lives in `src/content/` and `src/pages/`.

## Commands

- `npm run dev` starts a local preview at http://localhost:4321
- `npm test` builds the site, then runs unit, built-page, and browser tests
- `npm run build` outputs the static site to `dist/`

Browser tests drive the locally installed Google Chrome.

## Hosting and form

- Hosted on Cloudflare, deployed from the `main` branch.
- The request form posts to Formspree (`https://formspree.io/f/xppzvnyv`), set in `src/config.ts`.
  Set `PUBLIC_FORM_ENDPOINT` to send to a different Formspree form (see `.env.example`).
