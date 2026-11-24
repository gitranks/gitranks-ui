import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** Every TypeScript file under `dirs` (repo paths), specs and fixtures left out. */
function sourcesUnder(...dirs: string[]): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(join(ROOT, dir))) {
      const path = join(dir, name);
      if (statSync(join(ROOT, path)).isDirectory()) {
        if (name !== 'node_modules' && name !== '__fixtures__') walk(path);
      } else if (/\.tsx?$/.test(name) && !/\.spec\.tsx?$/.test(name)) {
        found.push(path);
      }
    }
  };
  for (const dir of dirs) walk(dir);
  return found.map((path) => relative(ROOT, join(ROOT, path)));
}

/** The lines of a file that are code, not a comment. */
const codeLines = (path: string) =>
  readFileSync(join(ROOT, path), 'utf8')
    .split('\n')
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => !/^\s*(?:\/\/|\/?\*)/.test(line));

describe("the workspace's addresses are built in one place", () => {
  /** The moved pages' old addresses, written as a string or the start of a template. */
  const OLD = /['"`]\/contribute\/(?:me|settings|connect|runs)(?=[/'"`?#]|\$\{)/;
  /** A contribution's and a lesson's old pages: the pull request's page by repo and issue now. */
  const ATTEMPT_PAGE = /['"`]\/(?:contribute|learn)\/attempts(?=[/'"`?#]|\$\{)/;
  /** Where the addresses are built, and where the old ones are sent on. */
  const BUILDERS = ['lib/workspace/paths.ts', 'lib/workspace/old-addresses.ts'];

  it('links no moved page by its old address outside the paths and the redirects', () => {
    const found = sourcesUnder('app', 'components', 'lib', 'design')
      .filter((path) => !BUILDERS.includes(path))
      .flatMap((path) =>
        codeLines(path)
          .filter(({ line }) => OLD.test(line))
          .map(({ number, line }) => `${path}:${number}: ${line.trim()}`),
      );
    expect(found).toEqual([]);
  });

  it("links a contribution's or a lesson's page through the paths alone, never by its old address", () => {
    const found = sourcesUnder('app', 'components', 'lib')
      .filter((path) => !BUILDERS.includes(path))
      .flatMap((path) =>
        codeLines(path)
          .filter(({ line }) => ATTEMPT_PAGE.test(line))
          .map(({ number, line }) => `${path}:${number}: ${line.trim()}`),
      );
    expect(found).toEqual([]);
  });
});

describe('the workspace has one poll', () => {
  /**
   * The timers allowed under the workspace's pages and components: clocks that read nothing, and the bounded waits that
   * end by themselves (the setting-up reload, the matching moment, the connect page's wait for the agent's first call,
   * the submit stepper, the first picks being ranked). Anything else that reads the API again rides the one poll.
   */
  const ALLOWED: Record<string, string> = {
    'components/workspace/activity.tsx': 'a clock for the bar',
    'components/workspace/pull-request/follow-up-buttons.tsx': 'a clock for a countdown',
    'components/workspace/masked-issue/issue-page-screen.tsx': "a clock for the hold's minutes",
    'components/workspace/setting-up-refresh.tsx': 'the setting-up reload, bounded',
    'components/workspace/matching.tsx': 'the matching moment, bounded',
    'components/workspace/agent/agent-connect.tsx': "the wait for the agent's first call, bounded",
    'components/workspace/pull-request/submit-stepper.tsx': 'the submit stepper, bounded',
    'app/contribute/components/still-ranking.tsx': 'the first picks being ranked, bounded',
  };

  it('starts no interval of its own outside the bounded waits', () => {
    const timers = sourcesUnder(
      'app/(workspace)',
      'app/contribute/components',
      'app/learn/components',
      'components/workspace',
      'components/contribute',
      'components/learn',
    ).filter((path) => codeLines(path).some(({ line }) => /\bsetInterval\s*\(/.test(line)));
    expect(timers.sort()).toEqual(Object.keys(ALLOWED).sort());
  });
});
