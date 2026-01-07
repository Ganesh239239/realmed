import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [
    react(),
    tailwind({
      // Optional: You can pass Tailwind config options here later
      applyBaseStyles: false, // We will import styles manually
    }),
  ],
  // Important for Cloudflare Pages static build
  output: 'static',
});
