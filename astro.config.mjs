import { copyFile } from 'node:fs/promises';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Canonical origin, used to build the absolute URLs in sitemap.xml.
  site: 'https://microsimulation.pub',
  output: 'static',
  trailingSlash: 'never',
  integrations: [
    // Regenerated from the built routes on every `astro build`, so it can't
    // drift from the site's actual pages.
    sitemap(),
    // The integration writes sitemap-index.xml; also serve it at the
    // conventional /sitemap.xml (a sitemap index is valid there).
    {
      name: 'sitemap-xml-alias',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          await copyFile(new URL('sitemap-index.xml', dir), new URL('sitemap.xml', dir));
        },
      },
    },
  ],
});
