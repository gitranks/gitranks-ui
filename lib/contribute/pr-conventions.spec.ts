import { describe, expect, it } from 'vitest';

import {
  type ContributeRepoConventions,
  type ContributeTitleRule,
  changelogLinesOf,
  checklistOf,
  entryLineOf,
  httpsOnly,
  titleBlocks,
  titleProblemOf,
  titleProblemsOf,
  withoutDraftMarks,
} from './pr-conventions';

const TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
const semantic: ContributeTitleRule = {
  hard: true,
  source: '`.github/semantic.yml`',
  types: TYPES,
  scopes: null,
  requireScope: false,
  pattern: null,
};
const conventions = (over: Partial<ContributeRepoConventions> = {}): ContributeRepoConventions => ({
  title: semantic,
  titleExamples: ['fix(platform/github): deduplicate re-run checks'],
  template: null,
  changelog: null,
  cla: null,
  dco: false,
  generated: [],
  notes: [],
  ...over,
});

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

  it('checks a required scope, the scopes listed, and the repo own pattern', () => {
    const scoped = { ...semantic, requireScope: true, scopes: ['cli', 'broker'] };
    expect(titleProblemOf('fix: x', scoped)).toContain('Add a scope');
    expect(titleProblemOf('fix(web): x', scoped)).toContain('`web` is not one of');
    expect(titleProblemOf('fix(cli): x', scoped)).toBeNull();
    // The repo's own pattern is shown, never run: a stranger's regex can backtrack for seconds.
    const pulsar = { ...semantic, hard: false, pattern: '^(([a-z ]+))+\\(x\\)$' };
    const started = Date.now();
    expect(titleProblemOf('fix the crash in the parser now', pulsar)).toBeNull();
    expect(Date.now() - started).toBeLessThan(50);
    expect(checklistOf(conventions({ title: pulsar }), { title: 'x', patch: null })[0].detail).toBe(
      `Pattern: ${pulsar.pattern}`,
    );
  });

  it('blocks only on a hard rule', () => {
    expect(titleBlocks('Deduplicate', { title: semantic })).toBe(true);
    expect(titleBlocks('Deduplicate', { title: { ...semantic, hard: false } })).toBe(false);
    expect(titleBlocks('fix: deduplicate', { title: semantic })).toBe(false);
  });
});

describe('This repo needs', () => {
  it('follows the title as typed, and names the CLA and the changelog line the change adds', () => {
    const repo = conventions({
      cla: { check: 'license/cla', signUrl: 'https://cla-assistant.io/renovatebot/renovate' },
      changelog: { kind: 'FILE', path: 'CHANGELOG.md', required: true, source: '20 of the last 20 merged PRs edit it' },
    });
    const bad = checklistOf(repo, { title: 'GitHub: deduplicate', patch: CHANGELOG_PATCH });
    expect(bad.map(({ key, state }) => [key, state])).toEqual([
      ['title', 'blocked'],
      ['cla', 'todo'],
      ['changelog', 'ok'],
    ]);
    expect(bad[1]).toMatchObject({ link: 'https://cla-assistant.io/renovatebot/renovate' });
    expect(bad[1].label).toContain("we can't sign for you");
    expect(bad[2].detail).toBe('- docs(): add a recipe [#<number>](<pull request URL>)');

    const good = checklistOf(repo, { title: 'fix(platform/github): deduplicate', patch: null });
    expect(good[0]).toMatchObject({ state: 'ok', detail: 'Like: fix(platform/github): deduplicate re-run checks' });
    expect(good[2]).toMatchObject({ state: 'todo' });
  });

  it('says nothing when the repo asks nothing we read', () => {
    expect(checklistOf(null, { title: 'x', patch: null })).toEqual([]);
    expect(checklistOf(conventions({ title: null, titleExamples: [] }), { title: 'x', patch: null })).toEqual([]);
  });

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

describe("the repo's agent rules and our own (actualbudget/actual#9396)", () => {
  const actual = conventions({
    title: null,
    titleExamples: [],
    titlePrefix: '[AI]',
    templateByHuman: true,
    agentMarker: '🤖',
  });

  it('never lets a WIP or draft mark through, and asks for the prefix', () => {
    expect(withoutDraftMarks('[WIP] [Bug]: null after deleting')).toBe('[Bug]: null after deleting');
    expect(withoutDraftMarks('[AI] WIP: fix it')).toBe('[AI] fix it');
    expect(withoutDraftMarks('Wipe the cache')).toBe('Wipe the cache');
    expect(titleProblemsOf('[WIP] fix it', null)).toContain('approved it as ready');
    expect(titleBlocks('[WIP] fix it', null)).toBe(true);
    expect(titleProblemsOf('Fix the null error', actual)).toContain('`[AI]`');
    expect(titleBlocks('[AI] Fix the null error', actual)).toBe(false);
  });

  it('lists the prefix and the template the user fills on GitHub', () => {
    const items = checklistOf(actual, { title: 'Fix the null error', patch: null });
    expect(items.map(({ key, state }) => [key, state])).toEqual([
      ['title', 'blocked'],
      ['template', 'todo'],
    ]);
    expect(items[0].label).toBe("A title starting with `[AI]`, as the repo's agent rules require");
    expect(items[1].label).toContain('filled in by you on GitHub');
    expect(checklistOf(actual, { title: '[AI] Fix the null error', patch: null })[0].state).toBe('ok');
    // A WIP mark is ours to keep out, whatever the repo asks.
    expect(checklistOf(conventions({ title: null }), { title: '[WIP] fix', patch: null })[0]).toMatchObject({
      key: 'title',
      state: 'blocked',
    });
  });
});
