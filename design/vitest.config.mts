import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// The screen catalogue's export: run by `pnpm design:export`, never by `pnpm test`.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, ''),
    },
  },
  test: {
    include: ['design/export.design.tsx'],
    setupFiles: ['design/setup.tsx'],
  },
});
