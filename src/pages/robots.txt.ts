import type { APIContext } from 'astro';

// The CV page carries a noindex meta tag, which crawlers must be allowed to
// fetch to see. The PDF cannot carry one (GitHub Pages sets no headers), so
// it is kept from crawlers here instead.
export const GET = ({ site }: APIContext) =>
  new Response(
    ['User-agent: *', 'Disallow: /cv.pdf', '', `Sitemap: ${new URL('sitemap-index.xml', site)}`, ''].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
