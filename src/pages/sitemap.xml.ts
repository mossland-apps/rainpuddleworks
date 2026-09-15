import type { APIRoute } from 'astro';
import { site } from '../config';

const pages = ['/', '/services/', '/website-rebuild/', '/privacy/'];

export const GET: APIRoute = () => {
  const urls = pages.map((path) => `  <url><loc>${site.url}${path}</loc></url>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
