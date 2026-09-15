import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parse, type HTMLElement } from 'node-html-parser';

export const DIST = join(process.cwd(), 'dist');
export const SITE = 'https://rainpuddleworks.com';

export function distExists(): boolean {
  return existsSync(join(DIST, 'index.html'));
}

/** Maps a site path like "/services/" to its built HTML file. */
export function fileForPath(path: string): string {
  const clean = path.split('#')[0].split('?')[0];
  if (clean === '/' || clean === '') return join(DIST, 'index.html');
  if (/\.[a-z0-9]+$/i.test(clean)) return join(DIST, clean);
  return join(DIST, clean.replace(/^\//, '').replace(/\/$/, ''), 'index.html');
}

const cache = new Map<string, HTMLElement>();

export function page(path: string): HTMLElement {
  const file = fileForPath(path);
  if (!cache.has(file)) {
    cache.set(file, parse(readFileSync(file, 'utf8')));
  }
  return cache.get(file)!;
}

/** Visible text with whitespace collapsed and curly quotes straightened. */
export function text(el: HTMLElement): string {
  return normalize(el.textContent);
}

export function normalize(value: string): string {
  return value
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function htmlPages(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.html')) out.push(full);
    }
  };
  walk(DIST);
  return out;
}

export function pathForFile(file: string): string {
  const rel = relative(DIST, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

export const PUBLIC_PAGES = ['/', '/services/', '/website-rebuild/', '/privacy/'];
