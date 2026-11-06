// @ts-check
import { defineConfig } from 'astro/config';

// Static site. Vercel serves dist/ and builds /api/*.js as serverless functions alongside it.
export default defineConfig({
  site: 'https://tours.fhsystems.dev',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  devToolbar: { enabled: false },
});
