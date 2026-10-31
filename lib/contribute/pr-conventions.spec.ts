import { describe, expect, it } from 'vitest';

import {
  type ContributeRepoConventions,
  type ContributeTitleRule,
  changelogLinesOf,
  checklistOf,
  titleBlocks,
  titleProblemOf,
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
    const pulsar = { ...semantic, types: ['fix', 'cleanup'], pattern: '^\\[(\\w*?)\\](?:\\[(.*?)\\])?(?:\\s*)(.*)$' };
    expect(titleProblemOf('[fix][cli] End early', pulsar)).toBeNull();
    expect(titleProblemOf('[feat][cli] End early', pulsar)).toContain('`feat` is not one of');
    expect(titleProblemOf('fix(cli): end early', pulsar)).toContain('title pattern');
    // A pattern this browser cannot compile checks nothing: the API's own check stands.
    expect(titleProblemOf('x', { ...semantic, pattern: '(?<' })).toBeNull();
  });

  it('blocks only on a hard rule', () => {
    expect(titleBlocks('Deduplicate', semantic)).toBe(true);
    expect(titleBlocks('Deduplicate', { ...semantic, hard: false })).toBe(false);
    expect(titleBlocks('fix: deduplicate', semantic)).toBe(false);
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
});
