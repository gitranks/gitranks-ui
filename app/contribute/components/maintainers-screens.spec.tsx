import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/contribute/maintainers/actions', () => ({
  signInAsMaintainer: vi.fn(),
  optOutMaintainerRepos: vi.fn(),
  optInMaintainerRepos: vi.fn(),
}));

const { MaintainerReposLoading, MaintainerReposPanel, MaintainersScreen } = await import('./maintainers-view');
const { OptOutResults } = await import('./maintainer-repos-form');

import type { ContributeMaintainerRepo, ContributeOptOutResult } from '@/lib/contribute/contribute.types';
import type { MaintainerReposView } from '@/lib/contribute/maintainers.data';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replace(/\s+/g, ' ');

const repo = (patch: Partial<ContributeMaintainerRepo>): ContributeMaintainerRepo => ({
  repoId: 'R_1',
  nameWithOwner: 'driftwood-js/driftwood',
  permission: 'ADMIN',
  stars: 12_345,
  isArchived: false,
  optedOut: false,
  optedOutAt: null,
  ...patch,
});

const REPOS = [
  repo({ repoId: 'R_1', optedOut: true, optedOutAt: '2026-10-28T09:00:00.000Z' }),
  repo({ repoId: 'R_2', nameWithOwner: 'driftwood-js/driftwood-devtools', permission: 'MAINTAIN', stars: 42 }),
  repo({ repoId: 'R_3', nameWithOwner: 'driftwood-js/old', isArchived: true, stars: 3 }),
];

const panel = (view: MaintainerReposView) => renderToStaticMarkup(<MaintainerReposPanel view={view} />);

describe('the maintainers page', () => {
  it('explains what Contribute does and the three ways out, the file shown as it is written', () => {
    const html = text(renderToStaticMarkup(<MaintainersScreen repos={null} />));

    expect(html).toContain('Pull requests from gitranks, and how to stop them');
    expect(html).toContain('spend their own AI credits on issues in open-source repos');
    expect(html).toContain('# .github/gitranks.yml contribute: off');
    expect(html).toContain('CONTRIBUTING.md, or an AI_POLICY.md');
    expect(html).toContain('1 open PR at a time');
  });

  it('asks a visitor without the page sign-in to sign in with GitHub, and says what the sign-in is used for', () => {
    const html = panel({ state: 'signed-out' });

    expect(text(html)).toContain('Sign in with GitHub');
    expect(text(html)).toContain('drop it within an hour');
    expect(html).not.toContain('role="alert"');
    expect(html).not.toContain('data-repo');
  });

  it('says it is reading the repos while GitHub answers', () => {
    const html = renderToStaticMarkup(<MaintainerReposLoading />);

    expect(html).toContain('aria-busy="true"');
    expect(text(html)).toContain('Reading your repos from GitHub');
  });

  it('says when the account maintains no public repo', () => {
    const html = panel({ state: 'listed', data: { login: 'octocat', repos: [], truncated: false } });

    expect(html).toContain('data-empty');
    expect(text(html)).toContain('Signed in on GitHub as octocat');
    expect(html).not.toContain('Opt out selected');
  });

  it('lists the repos with their stars, role, archive and opt-out, and the two changes', () => {
    const html = panel({ state: 'listed', data: { login: 'octocat', repos: REPOS, truncated: false } });
    const rows = html.split('data-repo=').slice(1).map(text);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain('driftwood-js/driftwood');
    expect(rows[0]).toContain('Opted out since Oct 28, 2026');
    expect(rows[0]).toContain('Admin');
    expect(rows[0]).toContain('★ 12.3K');
    expect(rows[1]).not.toContain('Opted out');
    expect(rows[1]).toContain('Maintain');
    expect(rows[2]).toContain('Archived');
    expect(html.match(/type="checkbox"/g)).toHaveLength(3);
    expect(text(html)).toContain('Opt out selected');
    expect(text(html)).toContain('Opt back in');
    expect(html).not.toContain('data-truncated');
  });

  it('says when only the most-starred repos are listed', () => {
    const html = panel({ state: 'listed', data: { login: 'octocat', repos: REPOS, truncated: true } });

    expect(html).toContain('data-truncated');
    expect(text(html)).toContain('Showing your 3 most-starred repos.');
  });

  it.each([
    ['SIGNED_OUT', 'GitHub did not accept your sign-in. Sign in again', 'Sign in again'],
    ['GITHUB_UNAVAILABLE', 'GitHub did not answer. Try again in a minute.', 'Try again'],
    ['FAILED', 'Something went wrong. Try again in a minute.', 'Try again'],
    ['NOT_AVAILABLE_YET', 'not available yet', null],
  ] as const)('tells %s in plain words, with the way on', (error, message, next) => {
    const html = panel({ state: 'failed', error });

    expect(html).toContain(`data-error="${error}"`);
    expect(text(html)).toContain(message);
    if (next === 'Sign in again') expect(text(html)).toContain('Sign in again');
    if (next === 'Try again') expect(html).toContain('href="/contribute/maintainers"');
    if (!next) {
      expect(html).not.toContain('href="/contribute/maintainers"');
      expect(html).not.toContain('type="submit"');
    }
  });

  it('says nothing about who may use Contribute, or which repos it reads', () => {
    for (const html of [
      renderToStaticMarkup(<MaintainersScreen repos={panel({ state: 'signed-out' })} />),
      panel({ state: 'listed', data: { login: 'octocat', repos: REPOS, truncated: false } }),
    ]) {
      expect(text(html).toLowerCase()).not.toMatch(/preview|in our pool|not in the pool|waitlist/);
    }
  });
});

describe('the results of a change', () => {
  const results: ContributeOptOutResult[] = [
    {
      repoId: 'R_1',
      nameWithOwner: 'driftwood-js/driftwood',
      optedOut: true,
      optedOutAt: '2026-10-29T10:00:00Z',
      reason: null,
    },
    { repoId: 'R_2', nameWithOwner: 'driftwood-js/fork', optedOut: false, optedOutAt: null, reason: 'NOT_MAINTAINER' },
    { repoId: 'R_9', nameWithOwner: null, optedOut: false, optedOutAt: null, reason: 'UNKNOWN_REPO' },
  ];

  it('tells each repo asked, refusals in plain words', () => {
    const html = renderToStaticMarkup(<OptOutResults change="out" results={results} repos={REPOS} />);
    const rows = html.split('data-result=').slice(1).map(text);

    expect(text(html)).toContain('Opted out: 1 of 3');
    expect(rows[0]).toContain('driftwood-js/driftwood');
    expect(rows[0]).toContain('Opted out. No issue of it is picked');
    expect(rows[1]).toContain('GitHub says your account does not administer or maintain it');
    expect(rows[2]).toContain('A repo');
    expect(rows[2]).toContain('GitHub does not show this repo to your account');
  });

  it('tells a repo opted back in', () => {
    const back = [{ ...results[0], optedOut: false, optedOutAt: null }];
    const html = text(renderToStaticMarkup(<OptOutResults change="in" results={back} repos={REPOS} />));

    expect(html).toContain('Opted back in: 1 of 1');
    expect(html).toContain('Opted back in. Its issues may be picked again later.');
  });
});
