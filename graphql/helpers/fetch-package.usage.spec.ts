import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * The only files that read a package's page from the API. Each runs only for a visitor who may see package pages: the
 * package's page, which the proxy shows to nobody else, and its route handler, which asks the gate first.
 */
const ALLOWED = new Set([
  'app/package/[registry]/[...name]/page.tsx',
  'app/api/packages/[registry]/[...rest]/route.ts',
  'graphql/helpers/fetch-package.ts',
]);

const MODULE = String.raw`['"\`][^'"\`]*(?:fetch-package|graphql\/package-page)(?:\.tsx?)?['"\`]`;

/**
 * A runtime use of the reads or of their documents: an import or a re-export from them, or a dynamic `import()`. A
 * type-only import or re-export reads nothing.
 */
const RUNTIME_IMPORT = new RegExp(
  [String.raw`(?:import|export)\s+(?!type\s)[^;]*?from\s+${MODULE}`, String.raw`import\s*\(\s*${MODULE}`].join('|'),
);

const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const TEST = /\.spec\.[jt]sx?$/;
const SKIPPED = new Set(['node_modules', 'public']);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith('.') || SKIPPED.has(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && SOURCE.test(entry.name) && !TEST.test(entry.name) ? [path] : [];
  });
}

describe("a package's page reads", () => {
  it('are made only by the package page and its route handler', () => {
    const readers = sourceFiles(ROOT)
      .filter((path) => RUNTIME_IMPORT.test(readFileSync(path, 'utf8')))
      .map((path) => relative(ROOT, path).split(sep).join('/'));

    expect(readers.filter((path) => !ALLOWED.has(path))).toEqual([]);
    expect(readers).toContain('app/package/[registry]/[...name]/page.tsx');
  });

  it('spot a runtime import and let a type-only one be', () => {
    expect(RUNTIME_IMPORT.test("import { fetchPackage } from '@/graphql/helpers/fetch-package';")).toBe(true);
    expect(RUNTIME_IMPORT.test("import { PackagePageDocument } from '@/graphql/package-page';")).toBe(true);
    expect(RUNTIME_IMPORT.test("import type { PackagePage } from '@/graphql/package-page';")).toBe(false);
    expect(
      RUNTIME_IMPORT.test("import { fetchPackageRankings } from '@/graphql/helpers/fetch-package-rankings';"),
    ).toBe(false);
  });
});
