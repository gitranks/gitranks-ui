// Contribute and Learn share one workspace. What both sides use lives in `lib/workspace/` and `components/workspace/`;
// what one side alone uses lives in its own folders. This check keeps the two sides from importing each other:
//
// | Folder                                  | May import (besides the site-wide modules, which every folder may)      |
// | --------------------------------------- | ----------------------------------------------------------------------- |
// | lib/workspace/                          | itself                                                                  |
// | lib/contribute/, lib/learn/             | itself, lib/workspace/                                                  |
// | components/workspace/                   | itself, lib/workspace/; its pull-request/ folder also lib/learn/        |
// | components/contribute/                  | itself, lib/contribute/, lib/workspace/, components/workspace/          |
// | components/learn/                       | itself, lib/learn/, lib/workspace/, components/workspace/               |
// | lib/auth/ (site-wide: any folder may    | itself, lib/workspace/                                                  |
// |   import it)                            |                                                                         |
// | Contribute's pages (app/contribute/)    | anything but lib/learn/, components/learn/ and Learn's pages            |
// | Learn's pages (app/learn/)              | anything but lib/contribute/, components/contribute/ and Contribute's   |
//
// Specs and fixtures are not checked. The imports that still cross are listed in `ALLOWED` below, by the importing
// file and the imported module; the list only shrinks: an entry that no longer crosses fails the check too.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The crossings left today, as `<file> -> <module>` (the module's path without its extension): none now. */
export const ALLOWED = [];

/** The folder rule's name for a path, or null for a site-wide module every folder may import. */
export function zoneOf(path) {
  if (path.startsWith('lib/workspace/')) return 'lib/workspace';
  if (path.startsWith('lib/auth/')) return 'lib/auth';
  if (path.startsWith('lib/contribute/')) return 'lib/contribute';
  if (path.startsWith('lib/learn/')) return 'lib/learn';
  if (path.startsWith('components/workspace/pull-request/')) return 'components/workspace/pull-request';
  if (path.startsWith('components/workspace/')) return 'components/workspace';
  if (path.startsWith('components/contribute/')) return 'components/contribute';
  if (path.startsWith('components/learn/')) return 'components/learn';
  if (/^app\/(?:\((?:workspace|onboarding)\)\/)?contribute\//.test(path)) return 'app/contribute';
  if (/^app\/(?:\((?:workspace|onboarding)\)\/)?learn\//.test(path)) return 'app/learn';
  return null;
}

const MAY_IMPORT = {
  'lib/workspace': ['lib/workspace'],
  'lib/contribute': ['lib/contribute', 'lib/workspace'],
  'lib/learn': ['lib/learn', 'lib/workspace'],
  'lib/auth': ['lib/auth', 'lib/workspace'],
  'components/workspace': ['components/workspace', 'components/workspace/pull-request', 'lib/workspace'],
  'components/workspace/pull-request': [
    'components/workspace',
    'components/workspace/pull-request',
    'lib/workspace',
    'lib/learn',
  ],
  'components/contribute': [
    'components/contribute',
    'components/workspace',
    'components/workspace/pull-request',
    'lib/contribute',
    'lib/workspace',
  ],
  'components/learn': [
    'components/learn',
    'components/workspace',
    'components/workspace/pull-request',
    'lib/learn',
    'lib/workspace',
  ],
};

const MAY_NOT_IMPORT = {
  'app/contribute': ['lib/learn', 'components/learn', 'app/learn'],
  'app/learn': ['lib/contribute', 'components/contribute', 'app/contribute'],
};

/** Whether a file at `from` may not import the module at `to` (both repo paths). */
export function crosses(from, to) {
  const a = zoneOf(from);
  const b = zoneOf(to);
  // Site-wide modules: every folder may import them. `lib/auth/` is one, with its own imports checked.
  if (!a || !b || b === 'lib/auth') return false;
  if (MAY_IMPORT[a]) return !MAY_IMPORT[a].includes(b);
  return (MAY_NOT_IMPORT[a] ?? []).includes(b);
}

const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)(['"])([^'"\n]+)\1/gm;

/** The repo path a specifier names, without its extension; null for a package. */
export function moduleOf(file, specifier) {
  if (specifier.startsWith('@/')) return normalize(specifier.slice(2)).replace(/\.(?:tsx?|mjs|js)$/, '');
  if (!specifier.startsWith('.')) return null;
  return normalize(join(dirname(file), specifier)).replace(/\.(?:tsx?|mjs|js)$/, '');
}

/** Every import of `source` (a file at `file`) the rule forbids, as `<file> -> <module>`. */
export function crossingsOf(file, source) {
  const found = new Set();
  for (const match of source.matchAll(SPECIFIER)) {
    const module = moduleOf(file, match[2]);
    if (module && crosses(file, module)) found.add(`${file} -> ${module}`);
  }
  return [...found];
}

/** Whether a file is checked: TypeScript under the folders the rule names, not a spec or a fixture. */
export const isChecked = (path) =>
  /\.tsx?$/.test(path) && !/\.spec\.tsx?$/.test(path) && !path.includes('/__fixtures__/') && zoneOf(path) !== null;

/** The problems: each crossing not allowed, and each allowed one that no longer crosses. */
export function problemsOf(crossings, allowed = ALLOWED) {
  const found = new Set(crossings);
  return [
    ...crossings.filter((crossing) => !allowed.includes(crossing)).map((crossing) => `not allowed: ${crossing}`),
    ...allowed
      .filter((entry) => !found.has(entry))
      .map((entry) => `no longer crosses, remove it from ALLOWED: ${entry}`),
  ];
}

function filesUnder(root, dir) {
  let entries;
  try {
    entries = readdirSync(join(root, dir), { withFileTypes: true });
  } catch {
    return [];
  }
  return entries.flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? filesUnder(root, path) : [path];
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = relative(process.cwd(), fileURLToPath(new URL('..', import.meta.url))) || '.';
  const files = ['lib', 'components', 'app'].flatMap((dir) => filesUnder(root, dir)).filter(isChecked);
  const crossings = files.flatMap((file) => crossingsOf(file, readFileSync(join(root, file), 'utf8')));
  const problems = problemsOf(crossings);
  for (const problem of problems) console.error(`check-workspace-imports: ${problem}`);
  console.log(`check-workspace-imports: ${files.length} files, ${crossings.length} allowed crossings`);
  if (problems.length) process.exit(1);
}
