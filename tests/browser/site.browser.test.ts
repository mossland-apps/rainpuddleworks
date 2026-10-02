import { preview } from 'astro';
import { chromium, type Browser, type Page } from 'playwright-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PUBLIC_PAGES, distExists } from '../build/helpers';

const PORT = 4329;
const BASE = `http://localhost:${PORT}`;

let server: Awaited<ReturnType<typeof preview>>;
let browser: Browser;

async function openPage(path: string, width = 1280, height = 900): Promise<Page> {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  return page;
}

beforeAll(async () => {
  if (!distExists()) throw new Error('Run "npm run build" first (npm test does this).');
  server = await preview({ root: process.cwd(), logLevel: 'error', server: { port: PORT } });
  browser = await chromium.launch({ channel: 'chrome' });
});

afterAll(async () => {
  await browser?.close();
  await server?.stop();
});

describe('layout', () => {
  it.each(PUBLIC_PAGES)('%s never scrolls sideways on a phone', async (path) => {
    const page = await openPage(path, 360, 780);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    await page.context().close();
  });

  it('shows the promise and main button on the first screen of a laptop', async () => {
    const page = await openPage('/', 1366, 768);
    const button = page.locator('.promise a.button--primary');
    const headline = page.locator('.promise h2');
    expect(await headline.isVisible()).toBe(true);
    const box = await headline.boundingBox();
    expect(box!.y + box!.height).toBeLessThan(768);
    const buttonBox = await button.boundingBox();
    expect(buttonBox!.y + buttonBox!.height).toBeLessThanOrEqual(768);
    await page.context().close();
  });

  it('uses the Rainpuddle typeface', async () => {
    const page = await openPage('/');
    await page.evaluate(() => document.fonts.ready);
    const loaded = await page.evaluate(() =>
      [...document.fonts].some((f) => f.family.includes('Plus Jakarta Sans') && f.status === 'loaded'),
    );
    expect(loaded).toBe(true);
    await page.context().close();
  });

  it.each([
    [1366, 768],
    [1920, 1080],
    [1024, 768],
  ])('shows the banner image behind the title at %ix%i without covering the words', async (width, height) => {
    const page = await openPage('/', width, height);
    const art = page.locator('.hero__art');
    expect(await art.isVisible()).toBe(true);
    expect(await art.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const hero = (await page.locator('.hero').boundingBox())!;
    const artBox = (await art.boundingBox())!;
    expect(Math.round(artBox.width)).toBe(Math.round(hero.width));
    expect(Math.round(artBox.height)).toBe(Math.round(hero.height));
    // The raindrop sits about 76% across the artwork; the title must end well before it.
    const title = (await page.locator('.hero h1').boundingBox())!;
    const dropX = await art.evaluate((img: HTMLImageElement) => {
      const scale = Math.max(img.clientWidth / img.naturalWidth, img.clientHeight / img.naturalHeight);
      const overflow = img.naturalWidth * scale - img.clientWidth;
      return img.getBoundingClientRect().left + img.naturalWidth * 0.764 * scale - overflow;
    });
    expect(title.x + title.width).toBeLessThan(dropX - 120);
    await page.context().close();
  });

  it('shows the banner image below the title on a phone', async () => {
    const page = await openPage('/', 390, 844);
    const art = page.locator('.hero__art');
    expect(await art.isVisible()).toBe(true);
    expect(await art.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    const title = (await page.locator('.hero__tagline').boundingBox())!;
    const artBox = (await art.boundingBox())!;
    expect(artBox.y).toBeGreaterThanOrEqual(title.y + title.height);
    expect(artBox.width).toBeGreaterThanOrEqual(389);
    await page.context().close();
  });
});

describe('About page', () => {
  it('actually loads the founder photo', async () => {
    const page = await openPage('/about/', 1280, 900);
    const photo = page.locator('#who-we-are img');
    await photo.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () => {
        const img = document.querySelector<HTMLImageElement>('#who-we-are img');
        return Boolean(img?.complete && img.naturalWidth > 0);
      },
      undefined,
      { timeout: 10000 },
    );
    const box = (await photo.boundingBox())!;
    expect(box.width).toBeGreaterThan(150);
    expect(box.height).toBeGreaterThan(150);
    await page.context().close();
  });

  it('stacks the founder photo above the text on a phone', async () => {
    const page = await openPage('/about/', 390, 844);
    const photo = (await page.locator('#who-we-are img').boundingBox())!;
    const name = (await page.locator('.founder__name').boundingBox())!;
    expect(photo.y + photo.height).toBeLessThanOrEqual(name.y + 1);
    expect(photo.width).toBeLessThanOrEqual(390);
    await page.context().close();
  });
});

describe('request form', () => {
  it('explains what is missing instead of sending an empty request', async () => {
    const page = await openPage('/');
    await page.click('#request button[type="submit"]');
    expect(await page.locator('#rf-name').getAttribute('aria-invalid')).toBe('true');
    expect(await page.locator('#rf-name-error').isVisible()).toBe(true);
    expect(await page.locator('#rf-email-error').textContent()).toMatch(/email/i);
    expect(await page.locator('#rf-website-error').textContent()).toMatch(/website/i);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('rf-name');
    await page.context().close();
  });

  it('clears an error once the field is fixed', async () => {
    const page = await openPage('/');
    await page.click('#request button[type="submit"]');
    await page.fill('#rf-name', 'Jordan Lee');
    await page.locator('#rf-name').blur();
    expect(await page.locator('#rf-name').getAttribute('aria-invalid')).toBeNull();
    expect(await page.locator('#rf-name-error').isHidden()).toBe(true);
    await page.context().close();
  });

  it('sends a valid request to the form service and thanks the visitor', async () => {
    const page = await openPage('/');
    let sent: Record<string, string> | null = null;
    await page.route('https://forms.example.test/**', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    await page.evaluate(() => {
      document.querySelector<HTMLFormElement>('#request form')!.dataset.endpoint = 'https://forms.example.test/f/demo';
    });
    await page.fill('#rf-name', 'Jordan Lee');
    await page.fill('#rf-email', 'jordan@example.com');
    await page.fill('#rf-website', 'example.com');
    await page.fill('#rf-message', 'Menu is broken on phones.');
    await page.click('#request button[type="submit"]');
    await page.waitForFunction(() => document.querySelector('#request [role="status"]')?.textContent?.includes('Thanks'));
    expect(sent).toMatchObject({
      name: 'Jordan Lee',
      email: 'jordan@example.com',
      website: 'https://example.com',
      service: 'Website Rescue',
    });
    expect(await page.locator('#request [role="status"]').textContent()).toContain('one business day');
    expect(await page.locator('#rf-name').isHidden()).toBe(true);
    await page.context().close();
  });

  it('offers the email address if the form service is down', async () => {
    const page = await openPage('/');
    await page.route('https://forms.example.test/**', (route) => route.fulfill({ status: 500, body: 'error' }));
    await page.evaluate(() => {
      document.querySelector<HTMLFormElement>('#request form')!.dataset.endpoint = 'https://forms.example.test/f/demo';
    });
    await page.fill('#rf-name', 'Jordan Lee');
    await page.fill('#rf-email', 'jordan@example.com');
    await page.fill('#rf-website', 'example.com');
    await page.click('#request button[type="submit"]');
    const status = page.locator('#request [role="status"]');
    await status.locator('a[href^="mailto:support@rainpuddleworks.com"]').waitFor();
    expect(await page.locator('#rf-name').inputValue()).toBe('Jordan Lee');
    await page.context().close();
  });

  it('shows the reason next to the field when Formspree rejects a value', async () => {
    const page = await openPage('/');
    await page.route('https://forms.example.test/**', (route) =>
      route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ errors: [{ field: 'email', code: 'TYPE_EMAIL', message: 'should be an email' }] }),
      }),
    );
    await page.evaluate(() => {
      document.querySelector<HTMLFormElement>('#request form')!.dataset.endpoint = 'https://forms.example.test/f/demo';
    });
    await page.fill('#rf-name', 'Jordan Lee');
    await page.fill('#rf-email', 'jordan@example.com');
    await page.fill('#rf-website', 'example.com');
    await page.click('#request button[type="submit"]');
    await page.locator('#rf-email-error').waitFor({ state: 'visible' });
    expect(await page.locator('#rf-email').getAttribute('aria-invalid')).toBe('true');
    expect(await page.locator('#rf-name').inputValue()).toBe('Jordan Lee');
    await page.context().close();
  });

  it('quietly drops submissions that fill in the hidden spam trap', async () => {
    const page = await openPage('/');
    let calls = 0;
    await page.route('https://forms.example.test/**', (route) => {
      calls += 1;
      return route.fulfill({ status: 200, body: '{}' });
    });
    await page.evaluate(() => {
      document.querySelector<HTMLFormElement>('#request form')!.dataset.endpoint = 'https://forms.example.test/f/demo';
      document.querySelector<HTMLInputElement>('#rf-company')!.value = 'spam';
    });
    await page.fill('#rf-name', 'Bot');
    await page.fill('#rf-email', 'bot@example.com');
    await page.fill('#rf-website', 'example.com');
    await page.click('#request button[type="submit"]');
    await page.waitForFunction(() => document.querySelector('#request [role="status"]')?.textContent?.includes('Thanks'));
    expect(calls).toBe(0);
    await page.context().close();
  });

  it('sends the chosen service from the Services page', async () => {
    const page = await openPage('/services/');
    let sent: Record<string, string> | null = null;
    await page.route('https://forms.example.test/**', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ status: 200, body: '{}' });
    });
    await page.evaluate(() => {
      document.querySelector<HTMLFormElement>('#request form')!.dataset.endpoint = 'https://forms.example.test/f/demo';
    });
    await page.selectOption('#rf-service', 'custom');
    await page.fill('#rf-name', 'Jordan Lee');
    await page.fill('#rf-email', 'jordan@example.com');
    await page.fill('#rf-website', 'https://example.com');
    await page.click('#request button[type="submit"]');
    await page.waitForFunction(() => document.querySelector('#request [role="status"]')?.textContent?.includes('Thanks'));
    expect(sent).toMatchObject({ service: 'Custom Web Development' });
    await page.context().close();
  });
});

describe('FAQ', () => {
  it('opens an answer when a question is clicked', async () => {
    const page = await openPage('/');
    const first = page.locator('#faq details').first();
    expect(await first.getAttribute('open')).toBeNull();
    await first.locator('summary').click();
    expect(await first.getAttribute('open')).not.toBeNull();
    await page.context().close();
  });
});
