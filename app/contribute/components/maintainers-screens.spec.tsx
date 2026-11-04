import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/contribute/maintainers/actions', () => ({
  signInAsMaintainer: vi.fn(),
  optOutMaintainerRepos: vi.fn(),
  optInMaintainerRepos: vi.fn(),
  sendPrReport: vi.fn(),
  sendPrHelped: vi.fn(),
  undoPrAction: vi.fn(),
}));
vi.mock('@/app/contribute/actions', () => ({ hidePrNote: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { MaintainerReposLoading, MaintainerReposPanel, MaintainersScreen, PrStrip } = await import('./maintainers-view');
const { OptOutResults } = await import('./maintainer-repos-form');
const { PrFeedbackScreen } = await import('./pr-feedback-view');
const { HelpedSent, ReportSent } = await import('./pr-feedback-forms');
const { PrNotesPanel } = await import('./pr-notes');

import {
  allLiveFacts,
  maintainerFacts,
  maintainerRepo,
  prCard,
  prNotes,
  prReportSent,
  prViewer,
} from '@/lib/contribute/__fixtures__/maintainers';
import type {
  ContributeMaintainerFacts,
  ContributeOptOutResult,
  ContributePrViewer,
} from '@/lib/contribute/contribute.types';
import type { MaintainerReposView } from '@/lib/contribute/maintainers.data';
import type { PrReportRead } from '@/lib/contribute/pr-feedback.data';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replace(/\s+/g, ' ')
    .replaceAll(' :', ':');

const repo = maintainerRepo;
const ORG_URL = 'https://github.com/settings/applications';

const REPOS = [
  repo({ repoId: 'R_1', optedOut: true, optedOutAt: '2026-10-28T09:00:00.000Z' }),
  repo({ repoId: 'R_2', nameWithOwner: 'driftwood-js/driftwood-devtools', permission: 'MAINTAIN', stars: 42 }),
  repo({ repoId: 'R_3', nameWithOwner: 'driftwood-js/old', isArchived: true, stars: 3 }),
];

const panel = (view: MaintainerReposView) =>
  renderToStaticMarkup(<MaintainerReposPanel view={view} orgAccessUrl={ORG_URL} />);
const page = (facts: ContributeMaintainerFacts | null = maintainerFacts(), badgeRepo?: string) =>
  renderToStaticMarkup(<MaintainersScreen facts={facts} repos={null} badgeRepo={badgeRepo} />);

describe('the maintainers page', () => {
  it('leads with who we are not, then the sections in order, with a ruled "On this page"', () => {
    const html = text(page());

    expect(html).toContain('Not another AI pull-request bot');
    expect(html).toContain('The AI PRs you’re used to');
    expect(html).toContain('On this page 01 How it works ↓ 02 Checks and limits ↓ 03 Work with us ↓');
    const order = [
      'How every PR is made',
      'Our own checks and limits come first',
      'Tell us how you’d like help',
      'Tell us how a PR went',
      'Rather we stay away? One step, at once',
      'Questions, ideas, anything else',
    ].map((heading) => html.indexOf(heading));
    expect(order.every((at, index) => at > 0 && (index === 0 || at > order[index - 1]))).toBe(true);
    expect(html).not.toMatch(/track record|pull requests opened/i);
  });

  it('takes every number from the facts, never its own', () => {
    const facts = maintainerFacts({ attemptsPerRepo: 2, prsPerMonth: 7, monthDays: 28, pauseStreak: 3, pauseDays: 45 });
    const html = text(page(facts));

    expect(html).toContain('2 at a time in your repo, 7 in 28 days at most');
    expect(html).toContain('2 attempts at a time');
    expect(html).toContain('7 PRs in 28 days');
    expect(html).toContain('3 closed in a row pause us for 45 days');
    expect(html).not.toMatch(/\b60 days\b|\b4 in 30\b/);
  });

  it('leaves the numbers out while the API does not answer them', () => {
    const html = page(null);

    expect(html).not.toContain('data-limit');
    expect(text(html)).not.toContain('at a time in your repo');
    expect(text(html)).toContain('# .github/gitranks.yml contribute: off');
  });

  it('shows only the live keys in the example and the table, and never how many there are', () => {
    const today = page();
    const config = text(today.split('data-config-card')[1].split('data-slot="card"')[0]);

    expect(config).toContain('contribute: on');
    expect(config).not.toMatch(/autopilot|min_rank|max_open_prs|contact/);
    expect(config).not.toContain('Set the same rules after signing in');
    expect(text(today)).not.toContain('Good first issues stay with people');
    expect(text(today)).not.toContain('Stays under your line and file limits');
    expect(text(today)).not.toMatch(/\b\d+ keys\b/);

    const all = text(page(allLiveFacts()));
    expect(all).toContain('autopilot: off');
    expect(all).toContain('min_account_age_years: 6');
    expect(all).toContain('min_rank: master');
    expect(all).toContain('Lower our limits, keep autopilot out');
    // Not until "Your repos" offers the rules.
    expect(all).not.toContain('Set the same rules after signing in');
    expect(all).toContain('Good first issues stay with people if you say so');
  });

  it('gives the badge’s Markdown exactly, for the visitor’s repo when a PR names it, and when priority applies', () => {
    const generic = text(page());
    expect(generic).toContain(
      '[![GitRanks Contribute](https://gitranks.com/badge/repo/your-org/your-repo/contribute.svg)](https://gitranks.com/contribute/maintainers)',
    );
    expect(generic).toContain(
      'Priority applies to repos we can suggest: active, with enough stars, and open to outside PRs.',
    );
    expect(generic).toContain('Copy Markdown');

    expect(text(page(maintainerFacts(), 'driftwood-js/driftwood'))).toContain(
      'https://gitranks.com/badge/repo/driftwood-js/driftwood/contribute.svg',
    );
    const noBoost = page(maintainerFacts({ badgeBoost: null }));
    expect(noBoost).not.toContain('data-badge-priority');
    expect(text(noBoost)).not.toContain('come first in their feed');
  });

  it('names the PR a footer link came from, with "This PR helped" and "Report this PR"', () => {
    const html = renderToStaticMarkup(<PrStrip card={prCard()} />);

    expect(text(html)).toContain('You came here from this pull request');
    expect(text(html)).toContain(
      'driftwood-js/driftwood#912 · opened Oct 27 by mira-dev · reviewed and submitted by mira-dev · agent: Claude (Opus)',
    );
    expect(html).toContain('href="/contribute/maintainers/report?from=6650a1b2c3d4e5f6a7b8c9d0&amp;kind=helped"');
    expect(html).toContain('href="/contribute/maintainers/report?from=6650a1b2c3d4e5f6a7b8c9d0"');
    expect(text(renderToStaticMarkup(<PrStrip card={prCard({ reviewed: false })} />))).toContain(
      'opened by mira-dev’s autopilot',
    );
  });

  it('asks a visitor without the page sign-in to sign in with GitHub, and says what the sign-in is used for', () => {
    const html = panel({ state: 'signed-out' });

    expect(text(html)).toContain('Or switch it off here');
    expect(text(html)).toContain('Sign in with GitHub');
    expect(html).toContain('name="returnTo" value="/contribute/maintainers"');
    expect(text(html)).toContain('no longer use it after an hour');
    expect(html).not.toContain('data-repo=');
  });

  it('signs in back to the page with the footer link it came from', () => {
    const html = renderToStaticMarkup(
      <MaintainerReposPanel
        view={{ state: 'signed-out' }}
        orgAccessUrl={ORG_URL}
        returnTo="/contribute/maintainers?from=6650a1b2c3d4e5f6a7b8c9d0"
      />,
    );

    expect(html).toContain('name="returnTo" value="/contribute/maintainers?from=6650a1b2c3d4e5f6a7b8c9d0"');
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

  it('lists the repos with their stars, role in plain words, archive and opt-out, and the two changes', () => {
    const html = panel({ state: 'listed', data: { login: 'octocat', repos: REPOS, truncated: false } });
    const rows = html.split('data-repo=').slice(1).map(text);

    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain('driftwood-js/driftwood');
    expect(rows[0]).toContain('Opted out since Oct 28, 2026');
    expect(rows[0]).toContain('Maintainer');
    expect(rows[0]).toContain('★ 12.3K');
    expect(rows[1]).toContain('Maintainer');
    expect(rows[2]).toContain('Archived');
    expect(text(html)).not.toMatch(/\b(Admin|Maintain|ADMIN|MAINTAIN)\b/);
    expect(text(html)).toContain('Opt out selected');
    expect(text(html)).toContain('Opt back in');
    expect(html).toContain(`href="${ORG_URL}"`);
    expect(text(html)).toContain('If it restricts third-party apps, GitHub may hide your role from us');
  });

  it('lists the blocked contributors and stopped PRs under their repo, each with Undo', () => {
    const listed = repo({
      repoId: 'R_1',
      blockedContributors: [{ login: 'mira-dev', since: '2026-10-28T11:04:00Z', by: 'sam-w', feedbackId: 'F_1' }],
      stoppedPrs: [{ number: 912, since: '2026-10-28T11:04:00Z', by: 'sam-w', feedbackId: 'F_1' }],
    });
    const html = panel({ state: 'listed', data: { login: 'sam-w', repos: [listed, REPOS[1]], truncated: false } });
    const actions = html.split('data-repo-actions=');

    expect(actions).toHaveLength(2);
    expect(text(actions[1])).toContain('Blocked contributors mira-dev · since Oct 28, 2026 · by sam-w Undo');
    expect(text(actions[1])).toContain('Stopped PRs #912 · since Oct 28, 2026 · by sam-w Undo');
    expect(actions[1]).toContain('href="https://github.com/driftwood-js/driftwood/pull/912"');
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
    if (next === 'Try again') expect(html).toContain('href="/contribute/maintainers#opt-out"');
    if (!next) {
      expect(html).not.toContain('href="/contribute/maintainers#opt-out"');
      expect(html).not.toContain('type="submit"');
    }
  });

  it('says nothing about who may use Contribute, or which repos it reads', () => {
    for (const html of [
      renderToStaticMarkup(<MaintainersScreen facts={maintainerFacts()} repos={panel({ state: 'signed-out' })} />),
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
    expect(rows[0]).toContain('Opted out. No issue of it is picked');
    expect(rows[1]).toContain('GitHub says your account does not administer or maintain it');
    expect(rows[2]).toContain('GitHub does not show this repo to your account');
  });
});

describe('the report pages', () => {
  const FROM = { from: prCard().attemptId };
  const screen = (read: PrReportRead | null, flow: 'report' | 'helped' = 'report', target: object | null = FROM) =>
    renderToStaticMarkup(<PrFeedbackScreen target={target as never} flow={flow} read={read} orgAccessUrl={ORG_URL} />);
  const found = (viewer: Partial<ContributePrViewer> = {}, flow: 'report' | 'helped' = 'report') =>
    screen({ state: 'found', card: prCard(), viewer: prViewer(viewer) }, flow);

  it('asks for the sign-in first, coming back to the same PR and flow', () => {
    const html = screen({ state: 'signed-out', card: prCard() }, 'helped');

    expect(text(html)).toContain('Thanks for taking a look. Let’s sign you in first');
    expect(text(html)).toContain('Keep scroll position when a nested layout re-renders');
    expect(html).toContain(
      'name="returnTo" value="/contribute/maintainers/report?from=6650a1b2c3d4e5f6a7b8c9d0&amp;kind=helped"',
    );
    expect(text(html)).toContain('Admin or maintain Report + stop work');
  });

  it('signs in for a PR named by its link too, without a card yet', () => {
    const pr = { pr: { nameWithOwner: 'driftwood-js/driftwood', number: 912 } };
    const html = screen({ state: 'signed-out', card: null }, 'report', pr);

    expect(text(html)).toContain('driftwood-js/driftwood#912');
    expect(html).toContain('value="/contribute/maintainers/report?pr=driftwood-js%2Fdriftwood%23912"');
  });

  it('gives a maintainer the actions, confirmed with GitHub, and the reply address prefilled', () => {
    const html = found();

    expect(text(html)).toContain('✓ Maintainer of driftwood-js/driftwood · confirmed with GitHub');
    expect(html).not.toContain('data-role-alert');
    expect(html.match(/data-check-card=/g)).toHaveLength(3);
    expect(html).not.toContain('opacity-55');
    expect(text(html)).toContain('No more GitRanks PRs from mira-dev here');
    expect(html).toContain('value="sam@driftwood.dev"');
    expect(text(html)).toContain('Undo any of them later under Your repos');
  });

  it.each([
    ['COLLABORATOR', true, 'collaborator', 'You can report, but not stop work here'],
    ['USER', true, 'user', 'We can’t confirm you maintain driftwood-js/driftwood'],
    ['USER', false, 'unconfirmed', 'We couldn’t confirm your role in driftwood-js/driftwood'],
  ] as const)(
    'tells a %s (confirmed: %s) why nothing applies by itself, the actions off',
    (role, roleConfirmed, alert, title) => {
      const html = found({ role, roleConfirmed, login: roleConfirmed ? 'ana-k' : null });

      expect(html).toContain(`data-role-alert="${alert}"`);
      expect(text(html)).toContain(title);
      expect(text(html)).toContain('Only admins and maintainers of driftwood-js/driftwood can do this');
      expect(html.match(/opacity-55/g)).toHaveLength(3);
      expect(text(html)).toContain('Send report');
      expect(text(html)).not.toContain('Send report and apply');
      expect(text(html)).not.toMatch(/\b(ADMIN|MAINTAIN|WRITE|TRIAGE|READ)\b/);
    },
  );

  it('adds the org hint where an org may hide the role', () => {
    const html = found({ role: 'USER', restrictedOrg: 'driftwood-js' });

    expect(text(html)).toContain('If driftwood-js restricts third-party apps, GitHub may hide your role from us');
    expect(html).toContain(`href="${ORG_URL}"`);
  });

  it('sends the PR’s own contributor to their page instead of a form', () => {
    const html = screen({ state: 'found', card: prCard({ isAuthor: true }), viewer: prViewer() });

    expect(text(html)).toContain('This is your own pull request');
    expect(html).toContain('href="/contribute/attempts/6650a1b2c3d4e5f6a7b8c9d0"');
    expect(html).not.toContain('<form');
  });

  it.each([
    ['GITHUB_UNAVAILABLE', 'Try again'],
    ['FAILED', 'Try again'],
    ['NOT_OURS', 'Back to the page for maintainers'],
    ['SIGNED_OUT', 'Sign in again'],
  ] as const)('tells %s, with the way on', (error, next) => {
    const html = screen({ state: 'failed', error, card: null });

    expect(html).toContain(`data-error="${error}"`);
    expect(text(html)).toContain(next);
    if (error === 'NOT_OURS') expect(text(html)).toContain("We didn't open this PR");
  });

  it('says a link that names no PR', () => {
    expect(text(screen(null, 'report', null))).toContain('This link doesn’t name a pull request');
  });

  it('says where a word goes in "This PR helped": a maintainer’s to the author, a user’s to us', () => {
    const maintainer = found({}, 'helped');
    expect(text(maintainer)).toContain('Glad it helped. What worked?');
    expect(text(maintainer)).toContain('We pass it on to mira-dev on GitRanks, with your login.');
    expect(text(maintainer)).toContain('You may quote this on gitranks.com');

    const user = found({ role: 'USER', login: 'ana-k' }, 'helped');
    expect(user).toContain('data-word-shown="no"');
    expect(user).not.toContain('data-role-alert');
    expect(found({ role: 'USER', roleConfirmed: false, login: null }, 'helped')).toContain(
      'data-role-alert="unconfirmed"',
    );
  });

  it('lists what a report applied with Undo, and what happens next', () => {
    const html = text(
      renderToStaticMarkup(
        <ReportSent card={prCard()} result={prReportSent()} requested={['STOP_PR']} replyTo="sam@driftwood.dev" />,
      ),
    );

    expect(html).toContain('Thanks. It’s with us, and your choices already apply');
    expect(html).toContain('GitRanks work on #912 stopped: no more agent commits or replies there. Undo');
    expect(html).toContain('Report R-0042');
    expect(html).toContain('We write to sam@driftwood.dev');
    expect(html).toContain('Rules for driftwood-js/driftwood');

    const plain = text(
      renderToStaticMarkup(
        <ReportSent card={prCard()} result={prReportSent({ actions: [], role: 'USER' })} replyTo={null} />,
      ),
    );
    expect(plain).toContain('Thanks. It’s with us');
    expect(plain).not.toContain('Done at once');
    expect(plain).not.toContain('We write to');
    expect(plain).not.toContain('Rules for');
  });

  it('says plainly when GitHub no longer confirmed the maintainer at the send, and nothing applied', () => {
    const html = renderToStaticMarkup(
      <ReportSent
        card={prCard()}
        result={prReportSent({ actions: [], role: 'COLLABORATOR' })}
        requested={['STOP_PR', 'REPO_OFF']}
        replyTo={null}
      />,
    );

    expect(html).toContain('data-dropped');
    expect(text(html)).toContain(
      'GitHub no longer confirms you maintain driftwood-js/driftwood, so nothing was applied; your report is with us.',
    );
    expect(html).not.toContain('data-applied');
    expect(text(html)).not.toContain('Rules for');
    expect(html).toContain('tabindex="-1"');
  });

  it('says a helped note is on the author’s page', () => {
    const html = renderToStaticMarkup(<HelpedSent card={prCard()} />);

    expect(text(html)).toContain('Noted. mira-dev will see it');
    expect(html).toContain('href="/contribute/maintainers?from=6650a1b2c3d4e5f6a7b8c9d0#work-with-us"');
  });
});

describe('the maintainers’ say on the contributor’s page', () => {
  it('shows the notes with the role in plain words, likes, the word and Hide', () => {
    const html = renderToStaticMarkup(<PrNotesPanel notes={prNotes()} repo="driftwood-js/driftwood" />);
    const notes = html.split('data-note=').slice(1).map(text);

    expect(text(html)).toContain('From the maintainers');
    expect(notes[0]).toContain('sam-w · maintainer · Oct 28, 2026');
    expect(notes[0]).toContain('Liked: solved the issue well, small and easy to review');
    expect(notes[0]).toContain('Clean fix, and thanks for the test.');
    expect(notes[0]).toContain('Hide');
    expect(notes[1]).toContain('ana-k · user');
    expect(html).not.toContain('data-pr-stopped');
  });

  it('keeps hidden notes to a line, to show again', () => {
    const read = prNotes();
    const html = renderToStaticMarkup(
      <PrNotesPanel notes={{ ...read, notes: [{ ...read.notes[0], hidden: true }] }} repo="driftwood-js/driftwood" />,
    );

    expect(html).not.toContain('data-note=');
    expect(text(html)).toContain('Hidden: sam-w Show');
  });

  it('says a maintainer stopped GitRanks work on the PR', () => {
    const stopped = { stopped: { login: 'sam-w', at: '2026-10-28T11:04:00Z' }, notes: [] };
    const html = renderToStaticMarkup(<PrNotesPanel notes={stopped} repo="driftwood-js/driftwood" />);

    expect(text(html)).toContain(
      'A maintainer of driftwood-js/driftwood stopped GitRanks work on this PR. Reply on GitHub yourself if you like.',
    );
    expect(html).not.toContain('From the maintainers');
  });

  it('shows nothing without a stop or a note', () => {
    expect(renderToStaticMarkup(<PrNotesPanel notes={{ stopped: null, notes: [] }} repo="x/y" />)).toBe('');
  });
});

describe('the controls that write to a stopped PR', () => {
  it('give way to a line saying why, inside a stopped PR alone', async () => {
    const { PrStoppedProvider, unlessPrStopped } = await import('./pr-stopped');
    const Approve = unlessPrStopped(({ label }: { label: string }) => <button type="button">{label}</button>);

    const stopped = text(
      renderToStaticMarkup(
        <PrStoppedProvider stopped>
          <Approve label="Approve and post" />
        </PrStoppedProvider>,
      ),
    );
    expect(stopped).toContain('Not available: a maintainer stopped GitRanks work on this PR.');
    expect(stopped).not.toContain('Approve and post');

    expect(
      text(
        renderToStaticMarkup(
          <PrStoppedProvider stopped={false}>
            <Approve label="Approve and post" />
          </PrStoppedProvider>,
        ),
      ),
    ).toContain('Approve and post');
  });
});
