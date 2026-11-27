import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/*
 * Build's copy, as a person reads it: no long dash and no en dash (they read as written by a machine), and never the
 * word "claim". Every file of Build's code and fixtures is read, comments included, so nothing slips in. A later page
 * adds its folder here.
 */

const ROOT = process.cwd();
const BUILD_FOLDERS = ['lib/build', 'components/build', 'app/(build)', 'app/(build-player)', 'app/api/me/build'];
const THIS_FILE = 'lib/build/build-copy.spec.ts';

function filesOf(folder: string): string[] {
  const path = join(ROOT, folder);
  return readdirSync(path).flatMap((name) => {
    const child = join(folder, name);
    return statSync(join(ROOT, child)).isDirectory() ? filesOf(child) : /\.(tsx?|mdx?)$/.test(name) ? [child] : [];
  });
}

const files = BUILD_FOLDERS.flatMap(filesOf)
  .map((file) => relative(ROOT, join(ROOT, file)).replaceAll('\\', '/'))
  .filter((file) => file !== THIS_FILE);

describe("Build's copy", () => {
  it('reads every folder of Build', () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain('lib/build/__fixtures__/step.ts');
  });

  it.each(files)('%s holds no long dash and no en dash', (file) => {
    const text = readFileSync(join(ROOT, file), 'utf8');
    expect(text).not.toMatch(/[\u2014\u2013]/);
  });

  it.each(files)('%s never says "claim"', (file) => {
    const text = readFileSync(join(ROOT, file), 'utf8');
    expect(text).not.toMatch(/claim/i);
  });
});
