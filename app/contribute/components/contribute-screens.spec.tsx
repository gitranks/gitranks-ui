import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/app/contribute/actions', () => ({}));
vi.mock('@/lib/contribute/contribute.data', () => ({ loadContribute: vi.fn(), loadIssues: vi.fn() }));

const { ConnectScreen, setupStepOf } = await import('./connect-view');
const { SettingsScreen } = await import('./settings-view');
const { IssuesScreen } = await import('./issues-view');
const { OverviewStatusView } = await import('./overview-status');
const { ContributeNotices } = await import('./contribute-notices');
const { ConnectResult } = await import('./connect-result');
const { IssueCard } = await import('./issue-card');
const { NOW, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { contributeNoticesOf } = await import('@/lib/contribute/contribute-state');

import type { ContributeConnectResult, ContributeIssue, ContributeView } from '@/lib/contribute/contribute.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

const notices = (view: ContributeView) =>
  renderToStaticMarkup(<ContributeNotices notices={contributeNoticesOf(view)} />);

describe('the notices above the Contribute pages', () => {
  it.each([
    ['noKey', 'no-key', 'Connect your Claude key to start', '/contribute/connect'],
    ['keyInvalid', 'key-invalid', 'Your Claude key stopped working', '/contribute/connect'],
    ['exhausted', 'exhausted', 'Your credits are used up for this cycle', 'renew on Nov 14'],
    ['limitReached', 'limit-reached', "Your workspace's spend limit is reached", 'on Nov 1'],
    ['grantMissing', 'grant-missing', 'Allow pull requests on GitHub', '/contribute/settings#access'],
    ['paused', 'paused', 'Contributing is paused', 'Resume in Settings'],
  ] as const)('show the %s state', (name, kind, title, detail) => {
    const html = notices(views[name]);

    expect(html).toContain(`data-notice="${kind}"`);
    expect(text(html)).toContain(title);
    expect(html.includes(detail) || text(html).includes(detail)).toBe(true);
  });

  it('show nothing for an active contributor, or about a grant the API does not answer yet', () => {
    expect(notices(views.active)).toBe('');
    expect(notices(views.fieldsMissing)).toBe('');
  });
});

describe('the overview', () => {
  it('leaves the pitch alone until a key is connected', () => {
    expect(renderToStaticMarkup(<OverviewStatusView view={views.noKey} now={NOW} />)).toBe('');
  });

  it("shows this cycle's spend and the next attempt", () => {
    const html = text(renderToStaticMarkup(<OverviewStatusView view={views.active} now={NOW} />));

    expect(html).toContain('Active');
    expect(html).toContain('$63.40 of $200 used this cycle');
    expect(html).toContain('renews Nov 14 · next attempt in 2 hours');
  });

  it('says a paused contributor is paused', () => {
    const html = text(renderToStaticMarkup(<OverviewStatusView view={views.paused} now={NOW} />));

    expect(html).toContain('Paused');
    expect(html).not.toContain('next attempt');
  });
});

describe('the connect screen', () => {
  const render = (view: ContributeView) => renderToStaticMarkup(<ConnectScreen view={view} today={14} />);

  it('starts on the key, with the Console walkthrough, the spend-limit guidance and the confirmation', () => {
    const html = render(views.noKey);
    const plain = text(html);

    expect(setupStepOf(views.noKey)).toBe(1);
    expect(html).toMatch(/aria-current="step"[^>]*>.*1 · Claude key/);
    expect(plain).toContain('Create a workspace named gitranks');
    expect(plain).toContain('Set its monthly spend limit');
    expect(plain).toContain('Check auto-reload first');
    expect(plain).toContain('I created a separate workspace for this key and set its monthly spend limit');
    expect(plain).toContain('Max 5x');
    expect(plain).toContain('Credits I bought');
    expect(plain).toContain('Your credits renew on');
    expect(html).toContain('type="password"');
  });

  it('explains the GitHub access: public_repo only, never workflows', () => {
    const plain = text(render(views.noKey));

    expect(plain).toContain('public_repo');
    expect(plain).toContain('workflow');
    expect(plain).toContain('Never anything on private repos, and never workflow files');
    expect(plain).toContain('Allow on GitHub');
  });

  it('moves to the GitHub access once the key is in, then to the preferences', () => {
    expect(setupStepOf(views.grantMissing)).toBe(3);
    expect(render(views.grantMissing)).toContain('data-grant="missing"');

    const preferences = { ...views.active, contributor: { ...views.active.contributor, step: 'PREFERENCES' as const } };
    expect(setupStepOf(preferences)).toBe(4);
    expect(text(render(preferences))).toContain('Show my issues');

    expect(setupStepOf(views.active)).toBe(5);
    expect(text(render(views.active))).toContain('You are all set.');
  });

  it('shows the GitHub access as not available yet, without a button, while it cannot be granted here', () => {
    const view = { ...views.grantMissing, grantAvailable: false };
    const html = render(view);

    expect(setupStepOf(view)).toBe(5);
    expect(html).toContain('data-grant-available="false"');
    expect(text(html)).toContain('Pull request access is not available yet.');
    expect(text(html)).not.toContain('Allow on GitHub');
  });

  it('does not hold the user on GitHub access when the API cannot tell the grant yet', () => {
    const view = { ...views.fieldsMissing, contributor: { ...views.active.contributor, step: 'PREFERENCES' as const } };

    expect(setupStepOf(view)).toBe(4);
    expect(render(view)).toContain('data-grant="unknown"');
  });

  it("shows the key's own trouble", () => {
    expect(render(views.keyInvalid)).toContain('data-notice="key-invalid"');
    expect(render(views.exhausted)).toContain('data-notice="exhausted"');
    expect(render(views.limitReached)).toContain('data-notice="limit-reached"');
  });
});

describe("the key check's result", () => {
  const render = (result: ContributeConnectResult, retryAfterSec: number | null = null) =>
    text(
      renderToStaticMarkup(
        <ConnectResult
          outcome={{
            result,
            retryAfterSec,
            credential: ['CONNECTED', 'EXHAUSTED', 'LIMIT_REACHED'].includes(result)
              ? (views.active.contributor.credentials[0] as never)
              : null,
          }}
        />,
      ),
    );

  it.each([
    ['CONNECTED', 'Key works'],
    ['EXHAUSTED', 'its credits are used up'],
    ['LIMIT_REACHED', "workspace's spend limit is reached"],
    ['INVALID', 'Anthropic refused this key'],
    ['MANAGED_AGENTS_UNAVAILABLE', 'This key cannot run hosted agents'],
    ['RATE_LIMITED', 'Anthropic is rate limiting this key'],
    ['UNAVAILABLE', 'Anthropic did not answer'],
    ['REFUSED', 'Anthropic refused the check'],
  ] as const)('explains %s', (result, title) => {
    expect(render(result)).toContain(title);
  });

  it('says what was saved, and that nothing was when it was not', () => {
    expect(render('CONNECTED')).toContain('…k3Qa · workspace wrkspc_01J…7HKf · agent ready');
    expect(render('INVALID')).toContain('Nothing was saved');
    expect(render('MANAGED_AGENTS_UNAVAILABLE')).toContain('Managed Agents');
    expect(render('RATE_LIMITED', 30)).toContain('Try again in 30 seconds');
    expect(render('RATE_LIMITED', 600)).toContain('Try again in about 10 minutes');
  });
});

describe('the settings screen', () => {
  const render = (view: ContributeView, grantRefusal?: 'refused' | 'unavailable') =>
    renderToStaticMarkup(<SettingsScreen view={view} now={NOW} grantRefusal={grantRefusal} />);

  it('has every setting, each section, and the delete', () => {
    const plain = text(render(views.active));

    for (const label of [
      'Each billing cycle',
      'Each week',
      'Each day',
      'Each attempt',
      'Attempts at a time',
      'Even, then a final sweep',
      'As fast as possible',
      'Only issues I queue',
      'Sweep days',
      'Credits renew on',
      'Main model',
      'Running tests and reading logs',
      'Writing tests',
      'Effort',
      'Changed lines',
      'Files',
      'Open PRs at a time',
      'DCO sign-off',
      'Autopilot',
      'Languages',
      'Issue kinds',
      'Largest issue size',
      'Keys and access',
      'Delete all Contribute data',
    ]) {
      expect(plain).toContain(label);
    }
  });

  it('pauses an active contributor and resumes a paused one', () => {
    expect(render(views.active)).toContain('data-paused="false"');
    expect(text(render(views.active))).toContain('Pause contributing');
    expect(render(views.paused)).toContain('data-paused="true"');
    expect(text(render(views.paused))).toContain('Resume contributing');
  });

  it('shows the key and its state, and asks for one when there is none', () => {
    expect(render(views.active)).toContain('data-key-state="VALID"');
    expect(text(render(views.keyInvalid))).toContain('refused by Anthropic');
    expect(text(render(views.keyInvalid))).toContain('Connect a new key');
    expect(text(render(views.exhausted))).toContain('credits used up until Nov 14');
    expect(text(render(views.limitReached))).toContain('workspace limit reached until Nov 1');
    expect(text(render(views.noKey))).toContain('Not connected');
    expect(text(render(views.noKey))).toContain('Connect your Claude key →');
  });

  it('connects a missing grant and revokes a granted one', () => {
    expect(render(views.grantMissing)).toContain('data-grant="missing"');
    expect(text(render(views.grantMissing))).toContain('Allow on GitHub');
    expect(render(views.active)).toContain('data-grant="connected"');
    expect(text(render(views.active))).toContain('public_repo, as @octocat');
    expect(text(render(views.active))).toContain('Revoke');
    expect(render(views.fieldsMissing)).toContain('data-grant="unknown"');
  });

  it('says why a grant was refused, and where to revoke it on GitHub', () => {
    const wrongAccount = render(views.grantMissing, 'refused');
    expect(wrongAccount).toContain('data-grant-refusal="refused"');
    expect(text(wrongAccount)).toContain('it must come from the GitHub account you are signed in with');
    expect(text(wrongAccount)).toContain('you may want to revoke it in Authorized OAuth Apps');
    expect(wrongAccount).toContain('href="https://github.com/settings/applications"');

    const unavailable = render(views.grantMissing, 'unavailable');
    expect(text(unavailable)).toContain('pull request access is not available yet');
    expect(unavailable).toContain('href="https://github.com/settings/applications"');
  });

  it('offers no grant button while access cannot be granted here, and asks nothing about it', () => {
    const view = { ...views.grantMissing, grantAvailable: false };
    const html = render(view);

    expect(html).toContain('data-grant-available="false"');
    expect(text(html)).toContain('Not available yet. It is coming soon.');
    expect(text(html)).not.toContain('Allow on GitHub');
    expect(html).not.toContain('data-notice="grant-missing"');
  });

  it('locks autopilot until three merged pull requests, then lets the user turn it on', () => {
    const locked = render(views.active);
    expect(locked).toContain('data-autopilot="locked"');
    expect(text(locked)).toContain('1 of 3 merged PRs');

    const unlocked = render(views.autopilotUnlocked);
    expect(unlocked).toContain('data-autopilot="unlocked"');
    expect(text(unlocked)).toContain('On');
  });
});

const ISSUE: ContributeIssue = {
  issueId: 'I_1',
  repositoryId: 'R_1',
  nameWithOwner: 'fern-lang/fern',
  number: 2481,
  url: 'https://github.com/fern-lang/fern/issues/2481',
  title: 'Formatter drops a trailing comment in match arms',
  labels: ['good first issue', 'formatter'],
  language: 'RUST',
  kind: 'BUG',
  size: 'S',
  score: 0.92,
  rank: 1,
  why: "you write Rust, and you've contributed to fern-lang/fern-lsp",
};

describe('issues for you', () => {
  const render = (page: Parameters<typeof IssuesScreen>[0]['page'], query = {}) =>
    renderToStaticMarkup(<IssuesScreen view={views.active} page={page} query={query} now={NOW} />);

  it('lists the picks with labels, why, the size where known, and Skip', () => {
    const html = render({
      items: [ISSUE, { ...ISSUE, issueId: 'I_2', size: null, rank: 2 }],
      next: 'c2',
      total: 42,
      computedAt: null,
    });
    const plain = text(html);

    expect(plain).toContain('42 open issues match your languages and topics');
    expect(plain).toContain('fern-lang/fern · #2481');
    expect(plain).toContain('good first issue');
    expect(plain).toContain("Why: you write Rust, and you've contributed to fern-lang/fern-lsp");
    expect(plain).toContain('Small');
    expect(plain).toContain('not known');
    expect(plain).toContain('Skip');
    expect(html).toContain('href="/contribute/issues?after=c2"');
    expect(plain).toContain('where known');
  });

  it('keeps the filters on the next page', () => {
    const html = render({ items: [ISSUE], next: 'c2', total: 1, computedAt: null }, { language: 'RUST', size: 'M' });

    expect(html.replaceAll('&amp;', '&')).toContain('href="/contribute/issues?language=RUST&size=M&after=c2"');
  });

  it('says when the feed is not available yet, empty, or empty under filters', () => {
    expect(text(render(undefined))).toContain('Issues are not available yet');
    expect(text(render({ items: [], next: null, total: 0, computedAt: null }))).toContain(
      'No issues picked for you yet',
    );
    expect(text(render({ items: [], next: null, total: 0, computedAt: null }, { kind: 'DOCS' }))).toContain(
      'No issues match these filters',
    );
  });

  it("shows the page's notices, a missing grant among them", () => {
    const html = renderToStaticMarkup(<IssuesScreen view={views.grantMissing} page={undefined} query={{}} />);

    expect(html).toContain('data-notice="grant-missing"');
  });

  it('links the issue only when its link points at GitHub, and shows the title as text otherwise', () => {
    expect(renderToStaticMarkup(<IssueCard issue={ISSUE} />)).toContain(
      'href="https://github.com/fern-lang/fern/issues/2481"',
    );
    for (const url of ['javascript:alert(1)', 'http://github.com/x', 'https://github.com.evil.example/x']) {
      const html = renderToStaticMarkup(<IssueCard issue={{ ...ISSUE, url }} />);

      expect(html).not.toContain('href=');
      expect(text(html)).toContain('Formatter drops a trailing comment in match arms');
    }
  });

  it('reads an issue without a title by its number', () => {
    expect(
      text(renderToStaticMarkup(<IssueCard issue={{ ...ISSUE, title: null, labels: [], kind: null }} />)),
    ).toContain('Issue #2481');
  });
});
