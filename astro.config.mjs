// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://sankaaa62.github.io',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ru'],
    routing: { prefixDefaultLocale: false },
  },
});
