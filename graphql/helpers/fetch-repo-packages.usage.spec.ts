import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/**
 * The only files that read a repository's packages from the API. Each runs only for a visitor who may see package
 * pages: the tabbed repository pages, which the proxy shows to nobody else, and the route handler, which asks the gate
 * first. Today's repository page never asks for those fields, so an API without them answers it as before.
 */
const ALLOWED = new Set([
  'app/repo/[owner]/[name]/(tabs)/layout.tsx',
  'app/repo/[owner]/[name]/(tabs)/overview/page.tsx',
  'app/repo/[owner]/[name]/(tabs)/used-by/page.tsx',
  'app/api/repo/[owner]/[name]/used-by/route.ts',
  'graphql/helpers/fetch-repo-packages.ts',
]);

const MODULE = String.raw`['"\`][^'"\`]*(?:fetch-repo-packages|graphql\/repo-packages)(?:\.tsx?)?['"\`]`;

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

describe("a repository's package reads", () => {
  it('are made only by the tabbed pages and the route handler behind the gate', () => {
    const readers = sourceFiles(ROOT)
      .filter((path) => RUNTIME_IMPORT.test(readFileSync(path, 'utf8')))
      .map((path) => relative(ROOT, path).split(sep).join('/'));

    expect(readers.filter((path) => !ALLOWED.has(path))).toEqual([]);
    expect(readers).toContain('app/repo/[owner]/[name]/(tabs)/used-by/page.tsx');
  });

  it("are not in today's repository page", () => {
    for (const file of [
      'app/repo/[owner]/[name]/page.tsx',
      'graphql/page-repo.gql',
      'graphql/fragments/repository.gql',
    ]) {
      const source = readFileSync(join(ROOT, file), 'utf8');
      expect(source, file).not.toMatch(/packages|usedBy/);
    }
  });

  it('spots a runtime import and lets a type-only one be', () => {
    expect(RUNTIME_IMPORT.test("import { fetchRepoPackages } from '@/graphql/helpers/fetch-repo-packages';")).toBe(
      true,
    );
    expect(RUNTIME_IMPORT.test("import {\n  RepoUsedByDocument,\n} from '@/graphql/repo-packages';")).toBe(true);
    expect(RUNTIME_IMPORT.test("import type { Unavailable } from '@/graphql/helpers/fetch-repo-packages';")).toBe(
      false,
    );
    for (const line of [
      "export { fetchRepoUsedBy } from '@/graphql/helpers/fetch-repo-packages';",
      "export * from '@/graphql/repo-packages';",
      "const reads = await import('@/graphql/helpers/fetch-repo-packages');",
      'const reads = await import(`./fetch-repo-packages.ts`);',
    ]) {
      expect(RUNTIME_IMPORT.test(line), line).toBe(true);
    }
    expect(RUNTIME_IMPORT.test("export type { RepoPackages } from '@/graphql/repo-packages';")).toBe(false);
  });
});
