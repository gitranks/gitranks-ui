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
    // The site's address, as production sets it: the badge snippets and links the boards show are absolute.
    env: { NEXT_PUBLIC_URI: 'https://gitranks.com' },
  },
});
