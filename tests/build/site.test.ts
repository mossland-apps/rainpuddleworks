import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  DIST,
  PUBLIC_PAGES,
  SITE,
  distExists,
  fileForPath,
  htmlPages,
  normalize,
  page,
  pathForFile,
  text,
} from './helpers';

beforeAll(() => {
  if (!distExists()) throw new Error('Run "npm run build" before the build tests (npm test does this).');
});

describe('every page', () => {
  it.each([...PUBLIC_PAGES, '/404.html'])('%s exists', (path) => {
    expect(existsSync(fileForPath(path))).toBe(true);
  });

  it.each(PUBLIC_PAGES)('%s has the basics a search engine and screen reader need', (path) => {
    const doc = page(path);
    expect(doc.querySelector('html')?.getAttribute('lang')).toBe('en');
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('title')?.textContent.trim().length).toBeGreaterThan(10);
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')?.length).toBeGreaterThan(50);
    expect(doc.querySelector('meta[name="viewport"]')).not.toBeNull();
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE}${path}`);
    expect(doc.querySelector('link[rel="icon"]')).not.toBeNull();
    expect(doc.querySelector('meta[property="og:image"]')?.getAttribute('content')).toMatch(/^https:\/\/rainpuddleworks\.com\//);
    expect(doc.querySelector('a.skip-link')?.getAttribute('href')).toBe('#main');
    expect(doc.querySelector('main#main')).not.toBeNull();
  });

  it('titles and descriptions are unique per page', () => {
    const titles = PUBLIC_PAGES.map((p) => page(p).querySelector('title')?.textContent);
    const descriptions = PUBLIC_PAGES.map((p) => page(p).querySelector('meta[name="description"]')?.getAttribute('content'));
    expect(new Set(titles).size).toBe(PUBLIC_PAGES.length);
    expect(new Set(descriptions).size).toBe(PUBLIC_PAGES.length);
  });

  it.each(PUBLIC_PAGES)('%s shows the Rainpuddle Website Rescue name in the header', (path) => {
    const brand = page(path).querySelector('header .brand');
    expect(brand && text(brand)).toBe('Rainpuddle Website Rescue');
    expect(brand?.getAttribute('href')).toBe('/');
  });

  it.each(PUBLIC_PAGES)('%s has the local business footer', (path) => {
    const footer = page(path).querySelector('footer');
    expect(footer).not.toBeNull();
    const footerText = text(footer!);
    expect(footerText).toContain('Rainpuddle LLC');
    expect(footerText).toContain('Fix what\'s broken. Keep what works.');
    expect(footerText).toContain('Locally owned in Lane County, Oregon, with service throughout the surrounding region.');
    expect(footer!.querySelector('a[href="mailto:support@rainpuddleworks.com"]')).not.toBeNull();
  });

  it('every image has alt text and nothing loads from outside the site', () => {
    for (const file of htmlPages()) {
      const doc = page(pathForFile(file));
      for (const img of doc.querySelectorAll('img')) {
        expect(img.hasAttribute('alt'), `${file}: <img> missing alt`).toBe(true);
        expect(img.getAttribute('src') ?? '').not.toMatch(/^https?:/);
      }
      for (const el of doc.querySelectorAll('script[src], link[rel="stylesheet"]')) {
        const ref = el.getAttribute('src') ?? el.getAttribute('href') ?? '';
        expect(ref, `${file}: external asset ${ref}`).not.toMatch(/^(https?:)?\/\//);
      }
    }
  });

  it('has no broken internal links or missing page sections', () => {
    const broken: string[] = [];
    for (const file of htmlPages()) {
      const from = pathForFile(file);
      for (const a of page(from).querySelectorAll('a[href]')) {
        const href = a.getAttribute('href')!;
        if (/^(mailto:|tel:|https?:)/.test(href)) continue;
        const [pathPart, hash] = href.split('#');
        const target = pathPart === '' ? from : pathPart;
        if (!existsSync(fileForPath(target))) {
          broken.push(`${from} -> ${href} (no page)`);
          continue;
        }
        if (hash && !page(target).querySelector(`[id="${hash}"]`)) {
          broken.push(`${from} -> ${href} (no #${hash})`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it('external links point only at our own email address', () => {
    for (const file of htmlPages()) {
      for (const a of page(pathForFile(file)).querySelectorAll('a[href^="mailto:"]')) {
        expect(a.getAttribute('href')).toMatch(/^mailto:support@rainpuddleworks\.com/);
      }
    }
  });

  it('never uses hype, fabricated proof, or subscription language', () => {
    const banned = [
      /digital transformation/i,
      /testimonial/i,
      /\bawards?\b/i,
      /award-winning/i,
      /trusted by/i,
      /\bclients? love\b/i,
      /\d+\+? (happy )?(clients|customers|websites rescued)/i,
      /\/mo\b/i,
      /per month/i,
      /subscription/i,
      /maintenance plan/i,
      /premium/i,
      /cutting[- ]edge/i,
      /world[- ]class/i,
      /lorem ipsum/i,
      /TODO/,
    ];
    for (const file of htmlPages()) {
      const body = text(page(pathForFile(file)).querySelector('body')!);
      for (const pattern of banned) {
        expect(body, `${pathForFile(file)} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it('never glues words together where a line break was dropped', () => {
    for (const file of htmlPages()) {
      for (const el of page(pathForFile(file)).querySelectorAll('main p, main li, main h2, main h3, main summary')) {
        expect(text(el), pathForFile(file)).not.toMatch(/[a-z](within|Website|Rainpuddle|support@)/);
      }
    }
  });

  it('publishes a sitemap of the public pages and a robots file', () => {
    const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
    for (const path of PUBLIC_PAGES) expect(sitemap).toContain(`<loc>${SITE}${path}</loc>`);
    expect(sitemap).not.toContain('404');
    const robots = readFileSync(join(DIST, 'robots.txt'), 'utf8');
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });
});

describe('homepage: Website Rescue', () => {
  const home = () => page('/');
  const body = () => text(home().querySelector('main')!);

  it('opens with the banner title and tagline', () => {
    const hero = home().querySelector('.hero');
    expect(hero).not.toBeNull();
    expect(text(hero!.querySelector('h1')!)).toBe('Rainpuddle Website Rescue');
    expect(text(hero!)).toContain("Fix what's broken. Keep what works.");
    const art = hero!.querySelector('img.hero__art');
    expect(art, 'hero banner image').not.toBeNull();
    expect(art!.getAttribute('alt')).toBe('');
    expect(art!.getAttribute('src')).toMatch(/^\/_astro\/rainpuddle-hero\..+\.webp$/);
    expect(art!.getAttribute('srcset')).toContain('w,');
    expect(art!.getAttribute('fetchpriority')).toBe('high');
    expect(art!.getAttribute('loading')).not.toBe('lazy');
    expect(hero!.querySelector('svg symbol'), 'old redrawn artwork removed').toBeNull();
  });

  it('puts the promise, price, button and reassurance straight under the banner', () => {
    const promise = home().querySelector('.hero + .promise');
    expect(promise).not.toBeNull();
    const t = text(promise!);
    expect(t).toContain("Your website probably doesn't need a rebuild.");
    expect(t).toContain('It may just need to be rescued.');
    expect(t).toContain('$349 flat');
    expect(t).toContain('Free site review. You approve the repair scope before paying anything.');
    expect(promise!.querySelector('a.button--primary[href="#request"]')).not.toBeNull();
  });

  it('has one primary call to action, always leading to the request form', () => {
    const primaries = home().querySelectorAll('a.button--primary');
    expect(primaries.length).toBeGreaterThan(0);
    for (const a of primaries) expect(a.getAttribute('href')).toBe('#request');
  });

  it('lists the problems and typical fixes', () => {
    const rows = home().querySelectorAll('#fixes tbody tr');
    expect(rows.map((r) => r.querySelectorAll('th, td').map((cell) => text(cell)).join(' '))).toEqual([
      "Visitors can't contact you Repair forms, buttons, email links, or CTAs",
      'The site breaks on phones Correct major responsive layout problems',
      'Pages feel slow or unstable Address obvious image and page-speed issues',
      'Navigation goes nowhere Repair broken links, menus, and missing images',
      'The site looks neglected Clean up headings, metadata, accessibility, and small wording issues',
    ]);
  });

  it("states what's included for $349", () => {
    const items = home().querySelectorAll('#included .included-list li').map((li) => text(li));
    expect(items).toEqual([
      'Review of up to 5 existing website pages',
      'Up to 10 agreed website fixes',
      'Mobile and responsive-layout corrections',
      'Broken link, button, image, and navigation fixes',
      'Contact-form and call-to-action repairs',
      'Basic page-speed and oversized-image improvements',
      'Basic title, heading, and metadata cleanup',
      'Basic accessibility corrections',
      'Small wording and content corrections',
      'Desktop and mobile testing',
      'A before-and-after summary of completed work',
      'One revision round',
      '7 days of follow-up coverage for problems directly related to our completed repairs',
    ]);
    const t = text(home().querySelector('#included')!);
    for (const line of ['No monthly contract.', 'No long-term retainer.', 'No surprise hourly bill.', 'No unnecessary redesign.']) {
      expect(t).toContain(line);
    }
  });

  it('walks through the five steps in order, with the payment split', () => {
    const steps = home().querySelectorAll('#how-it-works ol.steps > li');
    expect(steps.map((s) => text(s.querySelector('h3')!))).toEqual([
      'Send Us Your Website',
      'We Identify the Problems',
      'Pay $175 to Start',
      'We Rescue the Site',
      'Review the Repairs',
    ]);
    const t = text(home().querySelector('#how-it-works')!);
    expect(t).toContain("You'll know what we're fixing before work begins.");
    expect(t).toContain('within 3 business days');
    expect(t).toContain('The remaining $174 is due when the project is complete.');
    expect(t).toMatch(/invoice/i);
  });

  it('describes a good candidate and the platforms we work on', () => {
    const t = text(home().querySelector('#good-fit')!);
    expect(t).toContain('Your website basically works');
    expect(t).toContain("That's exactly what Website Rescue is for.");
    for (const platform of ['WordPress', 'Squarespace', 'Wix', 'Weebly', 'Shopify', 'hand-coded']) {
      expect(t).toContain(platform);
    }
  });

  it("is honest about what Rescue is not, and when a site needs more", () => {
    const section = home().querySelector('#not-included')!;
    const items = section.querySelectorAll('li').map((li) => text(li));
    expect(items).toEqual([
      'Complete website redesigns',
      'New brand identity development',
      'Large-scale copywriting',
      'Major online-store rebuilds',
      'Custom web applications',
      'Domain or hosting migrations',
      'Paid themes, plugins, software, or licenses',
    ]);
    const t = text(section);
    expect(t).toContain("If your website needs something larger, we'll tell you before you pay for Website Rescue.");
    expect(t).toContain('Website Rescue is never used to push an unnecessary rebuild.');
  });

  it('introduces the business as locally owned, without inventing a person', () => {
    const t = text(home().querySelector('#about')!);
    expect(t).toContain('Lane County, Oregon');
    expect(t).toContain("We don't believe every dated website needs to be replaced.");
    expect(t).toContain("If the site you already have can be repaired economically, we'll recommend repair.");
    expect(home().querySelector('#about img')).toBeNull();
  });

  it('answers common questions in a simple FAQ', () => {
    const faqs = home().querySelectorAll('#faq details');
    expect(faqs.length).toBeGreaterThanOrEqual(5);
    expect(faqs.length).toBeLessThanOrEqual(7);
    for (const d of faqs) expect(d.querySelector('summary')).not.toBeNull();
  });

  it('ends with the request form and the closing offer', () => {
    const section = home().querySelector('#request')!;
    const t = text(section);
    expect(t).toContain('Fix the Website You Already Have.');
    expect(t).toContain('$175 to start. $174 at completion.');
    expect(t).toContain("we'll reply within one business day with next steps.");
    const form = section.querySelector('form.request-form')!;
    expect(form).not.toBeNull();
    for (const name of ['name', 'email', 'website', 'message']) {
      const field = form.querySelector(`[name="${name}"]`);
      expect(field, `missing ${name}`).not.toBeNull();
      const id = field!.getAttribute('id');
      expect(form.querySelector(`label[for="${id}"]`), `unlabeled ${name}`).not.toBeNull();
    }
    expect(form.querySelector('input[type="hidden"][name="service"]')?.getAttribute('value')).toBe('rescue');
    const trap = form.querySelector('[name="company"]')!;
    expect(trap.getAttribute('tabindex')).toBe('-1');
    expect(trap.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(form.querySelector('button[type="submit"]')).not.toBeNull();
    expect(form.querySelector('[role="status"]')).not.toBeNull();
  });

  it('keeps the Rebuild offer in the background', () => {
    const t = body();
    expect(t).not.toContain('$1,495');
    expect(t).not.toMatch(/credit/i);
  });

  it('describes the business for search engines', () => {
    const script = home().querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(script!.textContent);
    expect(data['@type']).toBe('ProfessionalService');
    expect(data.email).toBe('support@rainpuddleworks.com');
    expect(normalize(JSON.stringify(data.areaServed))).toContain('Lane County');
    expect(data.url).toBe(`${SITE}/`);
  });
});

describe('services page', () => {
  const doc = () => page('/services/');

  it('presents three distinct services with their own jobs and prices', () => {
    const cards = doc().querySelectorAll('.service');
    expect(cards).toHaveLength(3);
    const [rescue, rebuild, custom] = cards.map((c) => text(c));
    expect(rescue).toContain('Website Rescue');
    expect(rescue).toContain('$349');
    expect(rescue).toContain("Fix what's broken. Keep what works.");
    expect(rebuild).toContain('Website Rebuild');
    expect(rebuild).toContain('From $1,495');
    expect(rebuild).toContain('Keep the business. Replace the website.');
    expect(custom).toContain('Custom Web Development');
    expect(custom).toContain('Custom quote');
  });

  it('links to the detail pages', () => {
    expect(doc().querySelector('.service a[href="/"]')).not.toBeNull();
    expect(doc().querySelector('.service a[href="/website-rebuild/"]')).not.toBeNull();
  });

  it('states the repair-first philosophy', () => {
    const t = text(doc().querySelector('main')!);
    expect(t).toContain("We don't believe every dated website needs to be replaced.");
  });

  it('lets visitors ask about any service from one form', () => {
    const form = doc().querySelector('#request form.request-form')!;
    const options = form.querySelectorAll('select[name="service"] option').map((o) => o.getAttribute('value'));
    expect(options).toEqual(['unsure', 'rescue', 'rebuild', 'custom']);
    for (const a of doc().querySelectorAll('a.button--primary')) expect(a.getAttribute('href')).toBe('#request');
  });
});

describe('Website Rebuild page', () => {
  const doc = () => page('/website-rebuild/');
  const t = () => text(doc().querySelector('main')!);

  it('names the service plainly with its own promise and price', () => {
    expect(text(doc().querySelector('h1')!)).toBe('Website Rebuild');
    expect(t()).toContain('Keep the business. Replace the website.');
    expect(t()).toContain('From $1,495');
  });

  it('lists what is and is not included, plus add-ons', () => {
    const included = doc().querySelectorAll('#rebuild-included li');
    expect(included).toHaveLength(14);
    expect(text(doc().querySelector('#rebuild-included')!)).toContain('Existing site archived before launch');
    const excluded = text(doc().querySelector('#rebuild-not-included')!);
    for (const item of [/e-commerce/i, /memberships/i, /custom software/i]) expect(excluded).toMatch(item);
    const addOns = text(doc().querySelector('#add-ons')!);
    expect(addOns).toContain('$125');
    expect(addOns).toContain('$75');
  });

  it('explains when a rebuild makes sense instead of a rescue', () => {
    expect(t()).toContain("If your site can be repaired economically, we'll recommend Website Rescue instead.");
    expect(doc().querySelector('main a[href="/"]')).not.toBeNull();
  });

  it('sends rebuild enquiries through the form labeled as Rebuild', () => {
    const hidden = doc().querySelector('#request input[type="hidden"][name="service"]');
    expect(hidden?.getAttribute('value')).toBe('rebuild');
    expect(t()).not.toMatch(/credit/i);
  });
});

describe('privacy page', () => {
  it('explains what the form collects and how to reach us', () => {
    const t = text(page('/privacy/').querySelector('main')!);
    expect(t).toMatch(/name, email address, website address/i);
    expect(t).toContain('support@rainpuddleworks.com');
    expect(t).toMatch(/do not sell/i);
  });

  it('is linked from the request form', () => {
    expect(page('/').querySelector('#request a[href="/privacy/"]')).not.toBeNull();
  });
});
