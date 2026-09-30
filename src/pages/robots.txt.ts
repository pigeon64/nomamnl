import { site } from '../config';
export const GET = () => new Response(`User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);
