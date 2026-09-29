import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { satteri } from '@astrojs/markdown-satteri';
import { katexPlugin } from './src/lib/katex-plugin';

export default defineConfig({
  // CI sets SITE_URL from the repo's Pages settings (the custom domain);
  // local builds, which are never deployed, fall back to the dev server.
  site: process.env.SITE_URL || 'http://localhost:4321',
  trailingSlash: 'ignore',
  // The CV is noindex, so it stays out of the sitemap too.
  integrations: [sitemap({ filter: (page) => !new URL(page).pathname.startsWith('/cv') })],
  markdown: {
    processor: satteri({ features: { math: true }, hastPlugins: [katexPlugin] }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },
});
