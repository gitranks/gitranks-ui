import { describe, expect, it } from 'vitest';

import { fullReposSet, resolve, setRepo, stackSet } from './__fixtures__/contribute-sets';
import { contributeModesShown } from './modes-gate';
import {
  addNoticeOf,
  addTargetOf,
  feedbackProblemOf,
  modeChipOf,
  modeSummaryOf,
  reasonsText,
  reasonText,
  settlingOf,
  statusOf,
  tiersOf,
  viaGroupsOf,
} from './set-format';

const noSkips = { ignored: 0, duplicate: 0, unsupported: [], failed: [] };

describe('who sees the modes', () => {
  it('only the logins they are open to, in any case', () => {
    expect(contributeModesShown('maslianok')).toBe(true);
    expect(contributeModesShown('Maslianok')).toBe(true);
    expect(contributeModesShown('octocat')).toBe(false);
    expect(contributeModesShown('')).toBe(false);
    expect(contributeModesShown(null)).toBe(false);
    expect(contributeModesShown(undefined)).toBe(false);
  });
});

describe('the add notice', () => {
  const list = { count: 50, cap: 50, rules: 'work' as const, listed: [] as string[] };
  const vercel = (name: string) => setRepo({ nameWithOwner: name, via: { kind: 'OWNER', login: 'vercel' } });

  it('says how many of a full org fit, why the rest were left out, and how to make room', () => {
    const notice = addNoticeOf(
      'vercel',
      {
        added: [vercel('vercel/next.js'), vercel('vercel/swr')],
        passed: 31,
        considered: 100,
        full: true,
        skipped: {
          ignored: 0,
          duplicate: 6,
          unsupported: Array.from({ length: 9 }, (_, index) => setRepo({ nameWithOwner: `vercel/k-${index}` })),
          failed: [
            { reason: 'OUTSIDE_MERGES', count: 38 },
            { reason: 'ARCHIVED', count: 11 },
            { reason: 'LICENSE', count: 5 },
          ],
        },
      },
      list,
    );

    expect(notice.tone).toBe('warn');
    expect(notice.title).toBe('Added 2 of 31 repos from vercel.');
    expect(notice.details).toEqual([
      "Your list is full (50 / 50), so the other 29 repos that passed didn't fit.",
      "From vercel's 100 most-starred repos: 31 passed, 54 didn't pass the rules (most often: no outside PR merged in 90 days (38), archived (11), no open-source license (5)), 9 are in languages not supported yet, 6 were already listed.",
      'Remove repos below, then add vercel again to fill the space with its next most popular repos.',
    ]);
  });

  it('counts each failed repo once, however many rules it failed, and merges reasons said the same way', () => {
    // 10 repos read: 4 passed, 6 failed; one of them failed three rules, the maintainers' "no" in three spellings.
    const notice = addNoticeOf(
      'acme',
      {
        added: Array.from({ length: 4 }, (_, index) =>
          setRepo({ nameWithOwner: `acme/r-${index}`, via: { kind: 'OWNER', login: 'acme' } }),
        ),
        passed: 4,
        considered: 10,
        full: false,
        skipped: {
          ...noSkips,
          failed: [
            { reason: 'OUTSIDE_MERGES', count: 5 },
            { reason: 'OPTED_OUT', count: 1 },
            { reason: 'AI_BAN', count: 1 },
            { reason: 'CONTRIBUTE_OFF', count: 1 },
            { reason: 'ARCHIVED', count: 1 },
          ],
        },
      },
      { ...list, count: 10 },
    );

    expect(notice.details).toEqual([
      "From acme's 10 repos: 4 passed, 6 didn't pass the rules (most often: no outside PR merged in 90 days (5), maintainers asked us not to send PRs (3), archived (1)).",
    ]);
  });

  it('names the owner as GitHub spells it, from what was added, never the link that was typed', () => {
    const notice = addNoticeOf(
      'https://github.com/VERCEL/',
      { added: [vercel('vercel/next.js')], passed: 1, considered: 1, full: false, skipped: noSkips },
      { ...list, count: 1 },
    );

    expect(notice.title).toBe('Added 1 repo from vercel.');
    expect(notice.details[0]).toMatch(/^From vercel's 1 repo:/);
    // Nothing added: the name as typed, read out of the link.
    expect(
      addNoticeOf('github.com/acme', { added: [], passed: 0, considered: 3, full: false, skipped: noSkips }, list)
        .title,
    ).toBe('Nothing new to add from acme.');
  });

  it('says greyed repos are on the list only when they are', () => {
    const kotlin = setRepo({
      nameWithOwner: 'acme/kotlin',
      status: 'UNSUPPORTED',
      via: { kind: 'OWNER', login: 'acme' },
    });
    const java = setRepo({ nameWithOwner: 'acme/java', status: 'UNSUPPORTED', via: { kind: 'OWNER', login: 'acme' } });
    const result = {
      added: [],
      passed: 0,
      considered: 2,
      full: false,
      skipped: { ...noSkips, unsupported: [kotlin, java] },
    };

    expect(addNoticeOf('acme', result, { ...list, listed: [kotlin.repositoryId, java.repositoryId] }).details).toEqual([
      "From acme's 2 repos: 0 passed, 2 are in languages not supported yet (shown greyed on your list, not counted).",
    ]);
    expect(addNoticeOf('acme', result, { ...list, listed: [kotlin.repositoryId] }).details[0]).toContain(
      '2 are in languages not supported yet (1 shown greyed on your list, not counted)',
    );
    expect(addNoticeOf('acme', result, list).details[0]).toContain('2 are in languages not supported yet.');

    const one = { ...result, considered: 1, skipped: { ...noSkips, unsupported: [kotlin] } };
    expect(addNoticeOf('acme/kotlin', one, { ...list, listed: [kotlin.repositoryId] }).title).toBe(
      'Added acme/kotlin, greyed out.',
    );
    expect(addNoticeOf('acme/kotlin', one, list)).toEqual({
      tone: 'neutral',
      title: "acme/kotlin wasn't added.",
      details: ["Its language isn't supported yet."],
    });
  });

  it('says why one repo was not added, in the words of its rules', () => {
    const failed = addNoticeOf(
      'acme/app',
      {
        added: [],
        passed: 0,
        considered: 1,
        full: false,
        skipped: { ...noSkips, failed: [{ reason: 'PUSHED', count: 1 }] },
      },
      { ...list, count: 3, rules: 'source' },
    );
    expect(failed.title).toBe("acme/app wasn't added: it didn't pass the rules.");
    expect(failed.details).toEqual(['No commits in 12 months.']);

    expect(
      addNoticeOf(
        'https://github.com/acme/app.git',
        { added: [], passed: 1, considered: 1, full: false, skipped: { ...noSkips, duplicate: 1 } },
        list,
      ).title,
    ).toBe('acme/app is already on your list.');
    expect(
      addNoticeOf('acme/app', { added: [], passed: 1, considered: 1, full: true, skipped: noSkips }, list).title,
    ).toBe("acme/app didn't fit: your list is full (50 / 50).");
  });

  it('says plainly when every one of your repos fit', () => {
    const notice = addNoticeOf(
      '@me',
      { added: [setRepo(), setRepo()], passed: 2, considered: 9, full: false, skipped: { ...noSkips, ignored: 1 } },
      { ...list, count: 5 },
    );

    expect(notice.tone).toBe('positive');
    expect(notice.title).toBe('Added 2 of your repos.');
    // 9 read: 2 passed, 1 ignored, so 6 failed rules the answer gives no reasons for.
    expect(notice.details).toEqual([
      "From your 9 repos: 2 passed, 6 didn't pass the rules, 1 is on your ignored repos.",
    ]);
  });
});

describe('the lists', () => {
  it('group by how a repo got there: @me, each user or org (latest first), then single repos', () => {
    const groups = viaGroupsOf([
      setRepo({ nameWithOwner: 'one/repo', via: { kind: 'REPO', login: null } }),
      setRepo({
        nameWithOwner: 'nodejs/node',
        via: { kind: 'OWNER', login: 'nodejs' },
        addedAt: '2026-10-26T00:00:00Z',
      }),
      setRepo({ nameWithOwner: 'octocat/a', via: { kind: 'ME', login: null } }),
      setRepo({
        nameWithOwner: 'vercel/swr',
        via: { kind: 'OWNER', login: 'vercel' },
        addedAt: '2026-10-28T00:00:00Z',
      }),
      setRepo({
        nameWithOwner: 'nodejs/undici',
        via: { kind: 'OWNER', login: 'NodeJS' },
        addedAt: '2026-10-26T00:00:00Z',
      }),
    ]);

    expect(groups.map(({ label, repos }) => [label, repos.map(({ nameWithOwner }) => nameWithOwner)])).toEqual([
      ['@me', ['octocat/a']],
      ['vercel', ['vercel/swr']],
      ['nodejs', ['nodejs/node', 'nodejs/undici']],
      ['Single repos', ['one/repo']],
    ]);
  });

  it("say a repo's status, a failed one with its reasons", () => {
    expect(statusOf({ status: 'CHECKING', reasons: [] }, 'work')).toEqual({ label: 'Reading', tone: 'neutral' });
    expect(statusOf({ status: 'CHECKING', reasons: [] }, 'source').label).toBe('Reading');
    expect(statusOf({ status: 'ACTIVE', reasons: [] }, 'work')).toEqual({ label: 'Active', tone: 'green' });
    expect(statusOf({ status: 'FAILED', reasons: ['OPTED_OUT', 'AI_BAN'] }, 'work')).toEqual({
      label: "Didn't pass: maintainers asked us not to send PRs",
      tone: 'red',
    });
    expect(statusOf({ status: 'UNSUPPORTED', reasons: ['LANGUAGE'] }, 'work').label).toBe(
      'Language not supported yet · not counted',
    );
  });

  it('say every reason in plain words', () => {
    expect(reasonText('PUSHED')).toBe('No commits in 90 days');
    expect(reasonText('PUSHED', 'source')).toBe('No commits in 12 months');
    expect(reasonText('NO_MANIFEST', 'source')).toBe('No dependency file we can read');
    expect(reasonsText(['FORK', 'ARCHIVED'])).toBe('A fork, Archived');
  });
});

describe('the Issues page by mode', () => {
  it('names the mode and its size', () => {
    expect(modeChipOf(stackSet())).toEqual({ title: 'Supporting your stack', detail: '50 libraries', quiet: false });
    expect(modeChipOf(stackSet({ stack: { ...stackSet().stack, fallback: 'SET_ONLY' } }), ['JS_TS'])).toEqual({
      title: 'Supporting your stack',
      detail: '50 libraries · only these · JS/TS',
      quiet: false,
    });
    expect(modeChipOf(fullReposSet(), ['GO', 'RUST'])).toEqual({
      title: 'Supporting 50 repos',
      detail: 'only these · Go, Rust',
      quiet: false,
    });
    expect(modeChipOf(stackSet({ mode: 'ALL' }))).toEqual({ title: 'All issues', detail: '', quiet: true });
    expect(modeChipOf(stackSet({ mode: 'ALL' }), ['GO', 'RUST', 'PHP']).detail).toBe('3 languages');
  });

  it('sums up each mode in the switcher', () => {
    expect(modeSummaryOf(stackSet(), 'STACK')).toBe('50 libraries from 3 repos');
    expect(modeSummaryOf(stackSet(), 'REPOS')).toBe('No repos added yet');
    expect(modeSummaryOf(fullReposSet(), 'REPOS')).toBe('50 repos saved');
    expect(modeSummaryOf(stackSet(), 'ALL')).toBe('~300 projects we picked');
  });

  it('splits the feed by tier only in a mode with a list, and only once tiers are answered', () => {
    const base = {
      issueId: 'I',
      repositoryId: 'R',
      nameWithOwner: 'a/b',
      number: 1,
      url: '',
      title: null,
      labels: [],
      language: null,
      kind: null,
      size: null,
      score: 1,
      rank: 1,
      why: '',
    };
    const items = [
      { ...base, issueId: 'I_1', tier: 0 },
      { ...base, issueId: 'I_2', tier: 1 },
    ];

    expect(tiersOf(items, 'STACK')).toEqual({ set: [items[0]], other: [items[1]] });
    expect(tiersOf(items, 'ALL')).toBeNull();
    expect(tiersOf(items, undefined)).toBeNull();
    expect(tiersOf([base], 'REPOS')).toBeNull();
  });
});

describe('the feedback message', () => {
  it('needs a few words, and no more than the limit', () => {
    expect(feedbackProblemOf('   ', 2000)).toBe('Write a few words first.');
    expect(feedbackProblemOf('x'.repeat(2001), 2000)).toBe('Keep it to 2,000 characters at most.');
    expect(feedbackProblemOf(' lodash is left out ', 2000)).toBeNull();
  });
});

describe('reading the page again while repos settle', () => {
  const checking = (name: string) => setRepo({ nameWithOwner: name, status: 'CHECKING' });

  it("looks only at the active mode's list, and at the libraries only in Stack mode", () => {
    const settled = stackSet({
      stack: { ...stackSet().stack, sources: [setRepo()], resolve: resolve({ targets: [] }) },
    });
    expect(settlingOf(settled)).toBe(false);

    // A repos list left reading when the user switched to Stack keeps nothing refreshing.
    const leftBehind = { ...settled, repos: { repos: [checking('a/b')], count: 1, fallback: 'THEN_ALL' as const } };
    expect(settlingOf(leftBehind)).toBe(false);
    expect(settlingOf({ ...leftBehind, mode: 'REPOS' })).toBe(true);
    expect(settlingOf({ ...leftBehind, mode: 'ALL' })).toBe(false);

    expect(settlingOf({ ...settled, stack: { ...settled.stack, sources: [checking('a/c')] } })).toBe(true);
    const resolving = {
      ...settled,
      stack: { ...settled.stack, resolve: resolve({ state: 'RESOLVING', targets: [] }) },
    };
    expect(settlingOf(resolving)).toBe(true);
    expect(settlingOf({ ...resolving, mode: 'REPOS' })).toBe(false);
  });
});

describe('what an add asked for', () => {
  it('reads @me, a login, owner/name and GitHub links', () => {
    expect(addTargetOf(' @me ')).toEqual({ kind: 'me', name: '@me' });
    expect(addTargetOf('vercel')).toEqual({ kind: 'owner', name: 'vercel' });
    expect(addTargetOf('https://github.com/vercel/')).toEqual({ kind: 'owner', name: 'vercel' });
    expect(addTargetOf('facebook/react')).toEqual({ kind: 'repo', name: 'facebook/react' });
    expect(addTargetOf('https://www.github.com/facebook/react/issues?q=1')).toEqual({
      kind: 'repo',
      name: 'facebook/react',
    });
  });
});
