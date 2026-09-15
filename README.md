# Rainpuddle Website Rescue

Marketing site for rainpuddleworks.com, built with Astro as a static site.

## Pages

- `/` Website Rescue ($349 fixed-price repair)
- `/services/` Rescue, Rebuild, and Custom Web Development
- `/website-rebuild/` Website Rebuild (from $1,495)
- `/privacy/` Privacy note

Prices live in `src/lib/pricing.ts`; page copy lives in `src/content/` and `src/pages/`.

## Commands

- `npm run dev` starts a local preview at http://localhost:4321
- `npm test` builds the site, then runs unit, built-page, and browser tests
- `npm run build` outputs the static site to `dist/`

Browser tests drive the locally installed Google Chrome.

## Before launch

1. Create a free Formspree form that delivers to support@rainpuddleworks.com.
2. Set `PUBLIC_FORM_ENDPOINT` to its URL in the hosting dashboard (see `.env.example`).
3. Deploy `dist/` to any static host and point rainpuddleworks.com at it.
