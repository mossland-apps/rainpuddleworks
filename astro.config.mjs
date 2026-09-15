import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://rainpuddleworks.com',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
});
