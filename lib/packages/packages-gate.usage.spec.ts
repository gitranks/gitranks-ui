import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * The only files that may import the packages gate. It decides before anything renders who a page is drawn for, so a
 * page or a layout never reads it: the proxy and route handlers do. The sitemaps and llms.txt ask, through one module,
 * only whether package pages are open to everyone.
 */
const ALLOWED = new Set([
  'proxy.ts',
  'proxy.spec.ts',
  'proxy-learn-visitors.spec.ts',
  'proxy-packages-gate.spec.ts',
  'app/api/badge/v3/[kind]/[...name]/route.ts',
  'app/api/badge/v3/[kind]/[...name]/route.spec.ts',
  'app/api/follow/change/route.ts',
  'app/api/follow/change/route.spec.ts',
  'app/api/follow/channels/route.ts',
  'app/api/follow/channels/route.spec.ts',
  'app/api/follow/start/route.ts',
  'app/api/follow/start/route.spec.ts',
  'app/api/follow/state/route.ts',
  'app/api/follow/state/route.spec.ts',
  'app/api/me/packages/open/route.ts',
  'app/api/me/packages/open/route.spec.ts',
  'app/api/packages/[registry]/[...rest]/route.ts',
  'app/api/packages/[registry]/[...rest]/route.spec.ts',
  'app/api/repo/[owner]/[name]/used-by/route.ts',
  'app/api/repo/[owner]/[name]/used-by/route.spec.ts',
  'app/badge/package/[registry]/[...rest]/route.ts',
  'app/badge/package/[registry]/[...rest]/route.spec.ts',
  'lib/packages/packages-gate.ts',
  'lib/packages/packages-gate.spec.ts',
  'lib/packages/packages-gate.usage.spec.ts',
  'lib/sitemap/packages-public.ts',
  'lib/sitemap/packages-public.spec.ts',
  'lib/sitemap/hidden-packages-unchanged.spec.ts',
]);

/**
 * The only files that may import the sitemaps' and llms.txt's question (`packages-public`), which reaches the gate one
 * step removed: a page or a layout must not read it either.
 */
const PUBLIC_ALLOWED = new Set([
  'app/llms.txt/route.ts',
  'app/sitemaps/packages/rankings/sitemap.ts',
  'app/sitemaps/packages/rankings/sitemap.spec.ts',
  'app/sitemaps/packages/sitemap.ts',
  'app/sitemaps/packages/sitemap.spec.ts',
  'lib/packages/packages-gate.usage.spec.ts',
  'lib/sitemap/packages-public.spec.ts',
  'lib/sitemap/repo-tab-sitemap.ts',
  'lib/sitemap/repo-tab-sitemap.spec.ts',
  'lib/sitemap/sitemap-index.ts',
  'lib/sitemap/sitemap-index.spec.ts',
]);

/** A module specifier naming the sitemaps' question, however it is reached. */
const PUBLIC_SPECIFIER = /['"`](?:[^'"`\n]*\/)?packages-public(?:\.tsx?)?['"`]/;

/** A module specifier naming the gate, however it is reached: `@/lib/packages/packages-gate`, `./packages-gate`… */
const GATE_SPECIFIER = /['"`](?:[^'"`\n]*\/)?packages-gate(?:\.tsx?)?['"`]/;

const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const SKIPPED = new Set(['node_modules', 'public']);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.') || SKIPPED.has(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && SOURCE.test(entry.name) ? [path] : [];
  });
}

describe('the packages gate', () => {
  it('is imported only by the proxy, its route handlers, the sitemaps and llms.txt, and its own specs', () => {
    const importers = sourceFiles(ROOT)
      .filter((path) => GATE_SPECIFIER.test(readFileSync(path, 'utf8')))
      .map((path) => relative(ROOT, path).split(sep).join('/'));

    expect(importers.filter((path) => !ALLOWED.has(path))).toEqual([]);
    expect(importers).toContain('proxy.ts');
  });

  it('is reached one step removed only by the sitemaps and llms.txt', () => {
    const importers = sourceFiles(ROOT)
      .filter((path) => PUBLIC_SPECIFIER.test(readFileSync(path, 'utf8')))
      .map((path) => relative(ROOT, path).split(sep).join('/'));

    expect(importers.filter((path) => !PUBLIC_ALLOWED.has(path))).toEqual([]);
    expect(importers).toContain('lib/sitemap/sitemap-index.ts');
  });

  it('spots an import from a page or a layout', () => {
    for (const line of [
      "import { requestMaySeePackages } from '@/lib/packages/packages-gate';",
      "const gate = await import('../../lib/packages/packages-gate');",
      "vi.mock('./packages-gate.ts', () => ({}));",
    ]) {
      expect(GATE_SPECIFIER.test(line), line).toBe(true);
    }
    expect(GATE_SPECIFIER.test("import { isPackagePath } from '@/lib/packages/package-paths';")).toBe(false);
  });
});
