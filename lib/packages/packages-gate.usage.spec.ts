import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * The only files that may import the packages gate. It decides before anything renders who a page is drawn for, so a
 * page or a layout never reads it: the proxy and route handlers do.
 */
const ALLOWED = new Set([
  'proxy.ts',
  'proxy.spec.ts',
  'proxy-learn-visitors.spec.ts',
  'proxy-packages-gate.spec.ts',
  'app/api/badge/v3/[kind]/[...name]/route.ts',
  'app/api/badge/v3/[kind]/[...name]/route.spec.ts',
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
]);

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
  it('is imported only by the proxy, its route handlers and its own specs', () => {
    const importers = sourceFiles(ROOT)
      .filter((path) => GATE_SPECIFIER.test(readFileSync(path, 'utf8')))
      .map((path) => relative(ROOT, path).split(sep).join('/'));

    expect(importers.filter((path) => !ALLOWED.has(path))).toEqual([]);
    expect(importers).toContain('proxy.ts');
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
