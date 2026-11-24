import { describe, expect, it } from 'vitest';

import { type ContributeTitleRule, changelogLinesOf, entryLineOf, httpsOnly, titleProblemOf } from './pr-conventions';

const TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
const semantic: ContributeTitleRule = {
  hard: true,
  source: '`.github/semantic.yml`',
  types: TYPES,
  scopes: null,
  requireScope: false,
  pattern: null,
};

const CHANGELOG_PATCH = [
  'diff --git a/src/a.ts b/src/a.ts',
  '+++ b/src/a.ts',
  '+const a = 1;',
  'diff --git a/CHANGELOG.md b/CHANGELOG.md',
  '--- a/CHANGELOG.md',
  '+++ b/CHANGELOG.md',
  '@@ -1,2 +1,3 @@',
  ' ## [next]',
  '+- docs(): add a recipe [#{{PR_NUMBER}}]({{PR_URL}})',
].join('\n');

describe('the title rule, as the API checks it', () => {
  it('passes the conventional form, an empty scope too, and says why another fails', () => {
    expect(titleProblemOf('fix(platform/github): deduplicate re-run checks', semantic)).toBeNull();
    expect(titleProblemOf('docs(): add a loadFromJSON recipe', semantic)).toBeNull();
    expect(titleProblemOf('Deduplicate status checks', semantic)).toContain('`type(scope): summary`');
    expect(titleProblemOf('GitHub: deduplicate status checks', semantic)).toContain('`GitHub` is not one of');
    expect(titleProblemOf('[Feature]: add a recipe', semantic)).toContain('`type(scope): summary`');
    expect(titleProblemOf('anything', null)).toBeNull();
  });
});

describe('This repo needs', () => {
  it('finds the changelog lines a patch adds, and only them', () => {
    expect(changelogLinesOf(CHANGELOG_PATCH, 'CHANGELOG.md')).toEqual([
      '- docs(): add a recipe [#{{PR_NUMBER}}]({{PR_URL}})',
    ]);
    expect(changelogLinesOf('diff --git a/x.ts b/x.ts\n+a', 'CHANGELOG.md')).toEqual([]);
  });

  it('shows the entry, not a changeset frontmatter or a heading, and only the repo own place', () => {
    expect(entryLineOf(['---', '"driftwood": patch', '---', 'Keep the cache'])).toBe('Keep the cache');
    expect(entryLineOf(['### Fixed', '- keep the cache'])).toBe('- keep the cache');
    expect(entryLineOf([])).toBeNull();
    const other = 'diff --git a/docs/CHANGELOG.md b/docs/CHANGELOG.md\n+- elsewhere';
    expect(changelogLinesOf(other, 'CHANGELOG.md')).toEqual([]);
    expect(changelogLinesOf('diff --git a/.changeset/a.md b/.changeset/a.md\n+x', '.changeset/')).toEqual(['x']);
  });
});

describe("the repo's own data, defused", () => {
  it('links only https', () => {
    expect(httpsOnly('https://cla-assistant.io/o/r')).toBe('https://cla-assistant.io/o/r');
    expect(httpsOnly('javascript:alert(1)')).toBeNull();
    expect(httpsOnly(null)).toBeNull();
  });
});
