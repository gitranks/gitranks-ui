import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// `@/` as `tsconfig.json` maps it, so a spec can import components the way the app does.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, ''),
    },
  },
});
