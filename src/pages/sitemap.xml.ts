import type { APIRoute } from 'astro';
const PAGES = [
  { path: '/', priority: '1.0' },
  { path: '/plan', priority: '0.8' },
  { path: '/about', priority: '0.5' },
  { path: '/credits', priority: '0.2' },
];
export const GET: APIRoute = ({ site }) => {
  const urls = PAGES.map((p) => `  <url><loc>${new URL(p.path, site).href}</loc><priority>${p.priority}</priority></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
