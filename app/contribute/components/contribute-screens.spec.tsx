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

const { ConnectScreen } = await import('./connect-view');
const { renewalDayOptionsOf } = await import('./key-connect');
const { ALL, FILTER_OPTIONS } = await import('./issues-filters');
const { helperModelLabelOf, testModelLabelOf } = await import('./settings-form');
const { sizeLabelOf } = await import('./preferences-fields');
const { KINDS, LANGUAGES } = await import('@/lib/contribute/format');
const { SettingsScreen } = await import('./settings-view');
const { IssuesScreen } = await import('./issues-view');
const { OverviewScreen, overviewSectionsOf } = await import('./overview-status');
const { overviewData } = await import('@/lib/contribute/__fixtures__/contribute-overview');
const { ContributeNotices } = await import('./contribute-notices');
const { ConnectResult } = await import('./connect-result');
const { IssueCard } = await import('./issue-card');
const { NOW, settings, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
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
    ['paused', 'paused', 'Contributing is paused', 'Resume in Settings'],
  ] as const)('show the %s state', (name, kind, title, detail) => {
    const html = notices(views[name]);

    expect(html).toContain(`data-notice="${kind}"`);
    expect(text(html)).toContain(title);
    expect(html.includes(detail) || text(html).includes(detail)).toBe(true);
  });

  it('show nothing for an active contributor, and never ask for the GitHub grant up front', () => {
    expect(notices(views.active)).toBe('');
    expect(notices(views.fieldsMissing)).toBe('');
    expect(notices(views.grantMissing)).toBe('');
  });
});

describe('the overview', () => {
  it('ends with the maintainers strip and the way back to how Contribute works, not the pitch', () => {
    const view = views.active;
    const html = renderToStaticMarkup(
      <OverviewScreen view={view} sections={overviewSectionsOf(view, overviewData(), NOW)} now={NOW} />,
    );
    const plain = text(html);

    expect(html).toContain('data-overview="footer"');
    expect(plain).toContain('Maintain a repo? At most one PR at a time, and every PR says it was made with AI.');
    expect(plain).not.toContain('four a month');
    expect(html).toContain('href="/contribute/maintainers"');
    expect(plain).toContain('How Contribute works');
    expect(html.replaceAll('&amp;', '&')).toContain('href="/contribute?about=1"');
    expect(plain).not.toContain('Fix real open-source issues');
    expect(plain).toContain('$63.40 of $200');
  });
});

describe('the connect screen', () => {
  const render = (view: ContributeView) => renderToStaticMarkup(<ConnectScreen view={view} today={30} />);

  it('is one screen: the Console key, the key itself, the limits from the plan, and what we apply', () => {
    const html = render(views.noKey);
    const plain = text(html);
    const cards = [
      '1 · Create a key in the Claude Console',
      '2 · Paste the key',
      '3 · Limit what the agent spends',
      'The limits we apply',
      'Connect and find issues',
    ];

    const at = cards.map((title) => plain.indexOf(title));
    expect(at.every((index) => index >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(plain).toContain('Connect your Claude key');
    expect(plain).toContain('The key is from a separate workspace with a monthly spend limit');
    expect(html).toMatch(/type="checkbox"[^>]*required/);
    expect(html).toContain('type="password"');
    expect(html).toContain('href="/contribute/connect?path=agent"');
    expect(plain).toContain('Open the Claude Console ↗');
  });

  it("offers the plans by name alone, and starts the month from the plan's allowance", () => {
    const html = render(views.newcomer);
    const plain = text(html);

    expect(html).toContain('data-limits="plan"');
    for (const plan of ['Max 5x', 'Max 20x', 'Team Standard', 'Team Premium']) expect(plain).toContain(plan);
    expect(html).toMatch(/aria-pressed="true"[^>]*>From my Claude plan/);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Max 5x/);
    expect(html.slice(0, html.indexOf('The limits we apply'))).not.toMatch(/\$\d/);
    expect(plain).toContain("up to $100 of your credits, Max 5x's monthly allowance");
    expect(plain).toContain('at most $5, it stops at the cap');
    expect(plain).toContain('no separate cap: pacing spreads the month');
    expect(plain).toContain('1 attempt, and at most 3 of your PRs open');
    expect(plain).toContain('at most 400 changed lines in 15 files');
    expect(plain).toContain('Sonnet 5.5 does the work, Haiku 5.5 helps');
    expect(plain).toContain("Languages: your profile's first");

    // A plan picked before is picked again.
    expect(text(render(views.noKey))).toContain("up to $200 of your credits, Max 20x's monthly allowance");
  });

  it('guesses the reset day as today, and says it is a guess', () => {
    const html = render(views.noKey);

    // Radix renders the items only when open: the trigger says the day picked, the items come from the props.
    expect(html).toMatch(
      /role="combobox"[^>]*id="[^"]*-day"><span data-slot="select-value"[^>]*>The 30th \(today, our guess\)<\/span>/,
    );
    const options = renewalDayOptionsOf(null, 30);
    expect(options.map(({ value }) => value)).toEqual(Array.from({ length: 31 }, (_, index) => String(index + 1)));
    expect(options[0]).toEqual({ value: '1', label: 'The 1st' });
    expect(options[29]).toEqual({ value: '30', label: 'The 30th (today, our guess)' });
    expect(text(html)).toContain('On which day of the month do your API credits reset?');
  });

  it('asks nothing about GitHub access, no preferences, and no setup steps', () => {
    const plain = text(render(views.noKey));

    expect(plain).not.toContain('public_repo');
    expect(plain).not.toContain('Allow on GitHub');
    expect(plain).not.toContain('What you like to work on');
  });

  it('opens on the hand-set limits for a key connected with them, and keeps the stored reset day', () => {
    const view = {
      ...views.active,
      contributor: {
        ...views.active.contributor,
        plan: 'CREDITS' as const,
        settings: { ...settings, cycleCapUsd: 80, dayCapUsd: 10, pace: 'FAST' as const },
      },
    };
    const html = render(view);
    const plain = text(html);

    expect(html).toContain('data-limits="manual"');
    expect(html).toContain('value="80"');
    expect(plain).toContain('At most $80 a month, $10 a day and $5 an attempt, as fast as those caps allow.');
    expect(plain).toContain('Connect a new Claude key');
    expect(html).toMatch(/role="combobox"[^>]*id="[^"]*-day"><span data-slot="select-value"[^>]*>The 14th<\/span>/);
    // A day already set is no guess: no item says "today".
    expect(renewalDayOptionsOf(14, 30).filter(({ label }) => label.includes('our guess'))).toEqual([]);
  });

  it("shows the key's own trouble", () => {
    expect(render(views.keyInvalid)).toContain('data-notice="key-invalid"');
    expect(render(views.exhausted)).toContain('data-notice="exhausted"');
    expect(render(views.limitReached)).toContain('data-notice="limit-reached"');
    expect(render(views.noKey)).not.toContain('data-notice="no-key"');
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

  it('says each pick in its trigger: the stored day, the models, the effort, and no size', () => {
    const html = render(views.active);
    const triggers = [
      ...html.matchAll(/role="combobox"[^>]*><span data-slot="select-value"[^>]*>([^<]*)<\/span>/g),
    ].map(([, label]) => label);

    expect(triggers).toEqual([
      'the 14th',
      'Claude Sonnet 5.5',
      'Claude Haiku 5.5 (cheaper)',
      'Same as the main model',
      'Medium',
      'Any size',
    ]);
    expect(helperModelLabelOf('CLAUDE_OPUS_5_5')).toBe('Claude Opus 5.5');
    expect(testModelLabelOf('CLAUDE_OPUS_5_5')).toBe('Claude Opus 5.5');
    expect(sizeLabelOf('L')).toBe('Up to large');
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

  it('says each filter in its trigger, "All …" for none, and offers the same items', () => {
    const triggers = (html: string) =>
      [...html.matchAll(/role="combobox"[^>]*><span data-slot="select-value"[^>]*>([^<]*)<\/span>/g)].map(
        ([, label]) => label,
      );

    expect(triggers(render(undefined))).toEqual(['All languages', 'All kinds', 'Any size']);
    expect(triggers(render(undefined, { language: 'GO', kind: 'DOCS', size: 'M' }))).toEqual([
      'Go',
      'Docs',
      'Up to medium, where known',
    ]);
    expect(FILTER_OPTIONS.language.map(({ value }) => value)).toEqual([ALL, ...Object.keys(LANGUAGES)]);
    expect(FILTER_OPTIONS.kind.map(({ value }) => value)).toEqual([ALL, ...Object.keys(KINDS)]);
    expect(FILTER_OPTIONS.size).toEqual([
      { value: ALL, label: 'Any size' },
      { value: 'S', label: 'Up to small, where known' },
      { value: 'M', label: 'Up to medium, where known' },
      { value: 'L', label: 'Up to large, where known' },
    ]);
  });

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
    expect(text(render({ items: [], next: null, total: 0, computedAt: '2026-10-28T07:00:00.000Z' }))).toContain(
      'No issues picked for you yet',
    );
    // Not computed yet: the first picks are on their way, and the page reads itself again.
    const ranking = render({ items: [], next: null, total: 0, computedAt: null });
    expect(text(ranking)).toContain('Your first picks are still being ranked');
    expect(ranking).toContain('data-ranking="waiting"');
    expect(text(render({ items: [], next: null, total: 0, computedAt: null }, { kind: 'DOCS' }))).toContain(
      'No issues match these filters',
    );
  });

  it("shows the page's notices, and asks for no GitHub access up front", () => {
    expect(renderToStaticMarkup(<IssuesScreen view={views.paused} page={undefined} query={{}} />)).toContain(
      'data-notice="paused"',
    );
    expect(renderToStaticMarkup(<IssuesScreen view={views.grantMissing} page={undefined} query={{}} />)).not.toContain(
      'data-notice',
    );
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
