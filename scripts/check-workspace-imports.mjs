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
// | Learn's pages (app/learn/, the groups   | anything but lib/contribute/, components/contribute/ and Contribute's   |
// |   (learn) and (player), the fixer's     |                                                                         |
// |   walkthrough under (player)/my/, and   |                                                                         |
// |   Learn's pages in (public))            |                                                                         |
// | Shared pages (both products open them:  | anything but either product's own: lib/learn/, components/learn/,       |
// |   (workspace)/my/ and (player)/my/,     |   lib/contribute/, components/contribute/ and either product's pages    |
// |   Approve included)                     |                                                                         |
//
// Specs and fixtures are not checked. The imports that still cross are listed in `ALLOWED` below, by the importing
// file and the imported module; the list only shrinks: an entry that no longer crosses fails the check too.
import { readdirSync, readFileSync } from 'node:fs';
import { join, posix, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The crossings left today, as `<file> -> <module>` (the module's path without its extension): the shared pages under
 * `/my` that still draw a product's own parts (Settings' two groups, the lesson and progress pages, the start page),
 * until those parts move to the shared folders or the pages are replaced.
 */
export const ALLOWED = [
  'app/(workspace)/my/error.tsx -> app/(workspace)/contribute/error',
  'app/(workspace)/my/issues/[id]/page.tsx -> lib/learn/learn.data',
  'app/(workspace)/my/progress/page.tsx -> components/learn/progress/progress-view',
  'app/(workspace)/my/pull-requests/by-attempt/[attemptId]/route.ts -> lib/learn/learn.data',
  'app/(workspace)/my/pull-requests/by-attempt/[attemptId]/route.ts -> lib/learn/learn-view',
  'app/(workspace)/my/pull-requests/[owner]/[repo]/[issue]/(latest)/lesson/page.tsx -> app/learn/components/lesson-view',
  'app/(workspace)/my/pull-requests/[owner]/[repo]/[issue]/earlier/[attemptId]/lesson/page.tsx -> app/learn/components/lesson-view',
  'app/(workspace)/my/settings/components/settings-pages.tsx -> app/learn/components/learn-setting-up',
  'app/(workspace)/my/settings/components/settings-pages.tsx -> components/contribute/mode-switch',
  'app/(workspace)/my/settings/components/settings-pages.tsx -> components/contribute/preferences-section',
  'app/(workspace)/my/settings/components/settings-pages.tsx -> components/contribute/set-list-screen',
  'app/(workspace)/my/settings/components/settings-pages.tsx -> components/contribute/settings-work-group',
  'app/(workspace)/my/settings/components/settings-pages.tsx -> components/learn/learn-profile-form',
  'app/(workspace)/my/settings/components/settings-pages.tsx -> lib/contribute/set-format',
  'app/(workspace)/my/settings/components/settings-pages.tsx -> lib/learn/learn.data',
  'app/(workspace)/my/settings/components/settings-pages.tsx -> lib/learn/learn.types',
  'app/(workspace)/my/settings/components/settings-view.tsx -> components/learn/settings/learn-email-rows',
  'app/(workspace)/my/settings/components/settings-view.tsx -> components/learn/settings/learn-preferences-group',
  'app/(workspace)/my/settings/components/settings-view.tsx -> lib/contribute/set-format',
  'app/(workspace)/my/settings/components/settings-view.tsx -> lib/contribute/work-summary',
  'app/(workspace)/my/settings/components/settings-view.tsx -> lib/learn/settings',
  'app/(workspace)/my/settings/components/settings-view.tsx -> lib/learn/settings.data',
  'app/(workspace)/my/settings/components/settings-view.tsx -> lib/learn/setup',
  'app/(workspace)/my/start/[owner]/[repo]/[issue]/page.tsx -> lib/learn/learn.data',
  'app/(workspace)/my/start/[owner]/[repo]/[issue]/page.tsx -> lib/learn/profile-form',
];

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
  if (/^app\/(?:\((?:workspace|onboarding|public)\)\/)?learn\//.test(path)) return 'app/learn';
  // Under the player's `/my`, the fixer's walkthrough is Learn's (only a Learn fix has one); the rest, Approve first, is
  // shared, as every workspace page under `/my` is.
  if (/^app\/\(player\)\/my\/(?:[^/]+\/)*walkthrough\//.test(path)) return 'app/learn';
  if (/^app\/\((?:workspace|player)\)\/my\//.test(path)) return 'app/shared';
  if (/^app\/\((?:learn|player)\)\//.test(path)) return 'app/learn';
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
  'app/shared': ['lib/learn', 'components/learn', 'app/learn', 'lib/contribute', 'components/contribute', 'app/contribute'],
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

/**
 * The repo path a specifier names, without its extension; null for a package. Always with `/`, on every platform:
 * the folders' names are matched by their `/` prefixes.
 */
export function moduleOf(file, specifier) {
  if (specifier.startsWith('@/')) return posix.normalize(specifier.slice(2)).replace(/\.(?:tsx?|mjs|js)$/, '');
  if (!specifier.startsWith('.')) return null;
  return posix.normalize(posix.join(posix.dirname(file), specifier)).replace(/\.(?:tsx?|mjs|js)$/, '');
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
