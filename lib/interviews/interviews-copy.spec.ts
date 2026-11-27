import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/*
 * Interviews' copy, as a person reads it: no long dash and no en dash (they read as written by a machine), and never
 * the word "claim". Every file of Interviews' code and fixtures is read, comments included, so nothing slips in. A
 * later page adds its folder here.
 */

const ROOT = process.cwd();
const INTERVIEWS_FOLDERS = [
  'lib/interviews',
  'components/interviews',
  'app/(interviews)',
  'app/(interviews-player)',
  'app/api/me/interviews',
];
const THIS_FILE = 'lib/interviews/interviews-copy.spec.ts';
/** Interviews' words outside its folders: the header's Grow menu, and its sitemap. */
const INTERVIEWS_FILES = [
  'components/header/components/grow-menu-item.tsx',
  'components/header/components/main-menu.tsx',
  'lib/sitemap/interviews-sitemap.ts',
  'lib/sitemap/interviews-sitemap.spec.ts',
  'app/sitemaps/interviews/sitemap.ts',
];

function filesOf(folder: string): string[] {
  const path = join(ROOT, folder);
  return readdirSync(path).flatMap((name) => {
    const child = join(folder, name);
    return statSync(join(ROOT, child)).isDirectory() ? filesOf(child) : /\.(tsx?|mdx?)$/.test(name) ? [child] : [];
  });
}

const files = [...INTERVIEWS_FOLDERS.flatMap(filesOf), ...INTERVIEWS_FILES]
  .map((file) => relative(ROOT, join(ROOT, file)).replaceAll('\\', '/'))
  .filter((file) => file !== THIS_FILE);

/** The long dash (U+2014) and the en dash (U+2013). */
const DASHES = new RegExp(`[${String.fromCharCode(0x2014, 0x2013)}]`);

describe("Interviews' copy", () => {
  it('reads every folder of Interviews', () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain('lib/interviews/__fixtures__/companies.ts');
    expect(files).toContain('components/interviews/sources/wrong-form.tsx');
  });

  it.each(files)('%s holds no long dash and no en dash', (file) => {
    const text = readFileSync(join(ROOT, file), 'utf8');
    expect(text).not.toMatch(DASHES);
  });

  it.each(files)('%s never says "claim"', (file) => {
    const text = readFileSync(join(ROOT, file), 'utf8');
    expect(text).not.toMatch(/claim/i);
  });
});
