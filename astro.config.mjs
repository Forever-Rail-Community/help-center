import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

// A fully static site. Articles come from the dashboard's public feed at build time (see src/lib/feed.ts),
// and the dashboard triggers a rebuild through a Vercel deploy hook whenever something is published.
export default defineConfig({
  site: 'https://help.foreverrail.com',
  trailingSlash: 'always',
  integrations: [sitemap()]
})
