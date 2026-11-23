import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/contribute/actions', () => ({}));
vi.mock('@/lib/workspace/issue-actions', () => ({}));
vi.mock('@/lib/workspace/gate.data', () => ({ loadLearnOpen: vi.fn() }));
vi.mock('@/lib/workspace/contribute.data', () => ({ loadContribute: vi.fn(), loadIssues: vi.fn() }));
vi.mock('@/lib/contribute/contribute.data', () => ({ loadIssues: vi.fn() }));
vi.mock('@/lib/learn/actions', () => ({}));
vi.mock('@/lib/learn/settings.data', () => ({}));
vi.mock('@/lib/learn/settings.actions', () => ({}));
vi.mock('@/lib/learn/learn.data', () => ({
  loadLearnProfile: vi.fn(),
  loadLearnSetup: vi.fn(),
  loadLearnOpen: vi.fn(),
}));

const { ConnectScreen } = await import('@/components/workspace/agent/connect-view');
const { renewalDayOptionsOf } = await import('@/components/workspace/agent/key-connect');
const { helperModelLabelOf, testModelLabelOf } = await import('@/components/workspace/settings/settings-form');
const { sizeLabelOf } = await import('@/components/contribute/preferences-fields');
const { SettingsScreen } = await import('@/app/(workspace)/my/settings/components/settings-view');
const { AgentScreen } = await import('@/components/workspace/agent/agent-screen');
const { FormSettingsScreen, KeyScreen } = await import('@/app/(workspace)/my/agent/components/agent-pages');
const { GithubSettingsScreen, PullRequestsSettingsScreen } = await import(
  '@/app/(workspace)/my/settings/components/settings-pages'
);
const { PreferencesFields } = await import('@/components/contribute/preferences-fields');
const { ContributeNotices } = await import('@/components/workspace/contribute-notices');
const { ConnectResult } = await import('@/components/workspace/agent/connect-result');
const { NOW, limits, mcpToken, settings, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { contributeNoticesOf } = await import('@/lib/workspace/contribute-state');

import type { ContributeConnectResult, ContributeIssue, ContributeView } from '@/lib/workspace/contribute.types';

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
    ['noKey', 'no-key', 'Connect your Claude key to start', '/my/agent/key'],
    ['keyInvalid', 'key-invalid', 'Your Claude key stopped working', '/my/agent/key'],
    ['exhausted', 'exhausted', 'Your credits are used up for this cycle', 'renew on Nov 14'],
    ['limitReached', 'limit-reached', "Your workspace's spend limit is reached", 'on Nov 1'],
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
    expect(plain).toContain("Auto-reload looks only at credits you bought, not your plan's");
    expect(plain).toContain("it can charge your card as soon as it's on, even while your plan's credits remain");
    expect(html).toMatch(/type="checkbox"[^>]*required/);
    expect(html).toContain('type="password"');
    expect(html).toContain('href="/my/agent/connect"');
    expect(plain).toContain('Open the Claude Console ↗');
  });

  it("offers the plans by name alone, and starts the month from the plan's allowance", () => {
    const html = render(views.newcomer);
    const plain = text(html);

    expect(html).toContain('data-limits="plan"');
    for (const plan of ['Max', 'Ultra', 'Team Standard', 'Team Premium']) expect(html).toContain(`>${plan}</button>`);
    expect(plain).not.toMatch(/Max 5x|Max 20x/);
    expect(html).toMatch(/aria-pressed="true"[^>]*>From my Claude plan/);
    expect(html).toMatch(/aria-pressed="true"[^>]*>Max<\/button>/);
    expect(html.slice(0, html.indexOf('The limits we apply'))).not.toMatch(/\$\d/);
    expect(plain).toContain("up to $100 of your credits, the Max plan's monthly allowance");
    expect(plain).toContain('at most $5, it stops at the cap');
    expect(plain).toContain('no separate cap: pacing spreads the month');
    expect(plain).toContain('1 attempt, and at most 3 of your PRs open');
    expect(plain).toContain('at most 400 changed lines in 15 files');
    expect(plain).toContain('Opus 5.5 does the work, Sonnet 5.5 writes tests, Haiku 5.5 helps');
    expect(plain).toContain("Languages: your profile's first");

    // A plan picked before is picked again.
    expect(text(render(views.noKey))).toContain("up to $200 of your credits, the Ultra plan's monthly allowance");
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

describe('the Agent and Settings tabs', () => {
  /** The two tabs' summaries, one after the other: every setting is on one of them. */
  const render = (view: ContributeView) =>
    renderToStaticMarkup(
      <>
        <AgentScreen view={view} now={NOW} />
        <SettingsScreen view={view} />
      </>,
    );
  /** The pages the summary's rows open, one after the other. */
  const pages = (view: ContributeView, grantRefusal?: 'refused' | 'unavailable') =>
    renderToStaticMarkup(
      <>
        <FormSettingsScreen page="budget" view={view} />
        <FormSettingsScreen page="model" view={view} />
        <PreferencesFields value={{ languages: [], kinds: [], maxSize: null }} onChange={() => {}} />
        <PullRequestsSettingsScreen view={view} />
        <KeyScreen view={view} today={30} now={NOW} />
        <GithubSettingsScreen view={view} grantRefusal={grantRefusal} />
      </>,
    );

  it('sums up every setting in a row with its value, each opening its page, and the delete', () => {
    const html = render({ ...views.active, ownAgent: { paths: { hosted: true, mcp: true }, tokens: [mcpToken()] } });
    const plain = text(html);

    for (const label of [
      'What you work on',
      'What you work on Rust · Bugs · any size',
      'Hosted agent Contribute only',
      'Budget and pacing $63.40 of $200 used this cycle · renews Nov 14 · up to $5 an attempt',
      'Model and effort Claude Sonnet 5.5, medium effort',
      'Autopilot',
      'Claude API key …k3Qa · works',
      'GitHub access public_repo, as @octocat',
      'Open pull requests at a time Up to 3',
      'Attempts at a time 1 issue in work at once',
      'Pull request size Up to 400 changed lines, 15 files · a larger change stops before review',
      'DCO sign-off Ask me each time a repo requires it',
      'Your own agent',
      'Delete all data',
    ]) {
      expect(plain).toContain(label);
    }
    for (const page of [
      '/my/agent/budget',
      '/my/agent/model',
      '/my/agent/key',
      '/my/agent/connect',
      '/my/settings/github',
      '/my/settings/pull-requests#open',
      '/my/settings/pull-requests#attempts',
      '/my/settings/pull-requests#size',
      '/my/settings/pull-requests#dco',
      '/my/settings/work',
    ]) {
      expect(html).toContain(`href="${page}"`);
    }
    expect(html).not.toContain('role="combobox"');
    expect(html).not.toContain('aria-label="Settings sections"');
  });

  it('names the agent on Settings and opens the Agent tab from it, and anchors pause and autopilot there', () => {
    const settings = renderToStaticMarkup(<SettingsScreen view={views.active} />);
    expect(text(settings)).toContain('AI agent The hosted agent, with your Claude key Edit');
    expect(settings).toMatch(/data-row="agent"[^>]*><a[^>]*href="\/my\/agent"/);
    const agent = renderToStaticMarkup(<AgentScreen view={views.active} now={NOW} />);
    for (const id of ['hosted-level', 'autopilot', 'own-agent']) expect(agent).toContain(`id="${id}"`);
  });

  it('has every setting on the pages the rows open', () => {
    const plain = text(pages(views.active));

    for (const label of [
      'Each billing cycle',
      'Each week',
      'Each day',
      'Each run',
      'Attempts at a time',
      'Even, then a final sweep',
      'As fast as possible',
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
      'Languages',
      'Issue kinds',
      'Largest issue size',
      'Claude API key',
      'GitHub access',
      'Attempts at a time is in Settings →',
    ]) {
      expect(plain).toContain(label);
    }
  });

  it('says each pick in its trigger: the stored day, the models, the effort, and no size', () => {
    const html = pages(views.active);
    const triggers = [
      ...html.matchAll(/role="combobox"[^>]*><span data-slot="select-value"[^>]*>([^<]*)<\/span>/g),
    ].map(([, label]) => label);

    expect(triggers).toEqual([
      'the 14th',
      'Claude Sonnet 5.5',
      'Medium',
      'Claude Haiku 5.5 (cheaper)',
      'Same as the main model',
      'Any size',
    ]);
    expect(helperModelLabelOf('CLAUDE_OPUS_5_5')).toBe('Claude Opus 5.5');
    expect(testModelLabelOf('CLAUDE_OPUS_5_5')).toBe('Claude Opus 5.5');
    expect(sizeLabelOf('L')).toBe('Up to large');
  });

  it('renders the pace and the DCO sign-off as radio groups, named, with the stored ones checked', () => {
    const html = pages(views.active);
    const groups = [...html.matchAll(/role="radiogroup"[^>]*aria-(label|labelledby)="([^"]*)"/g)].map(
      ([, kind, name]) =>
        kind === 'label' ? name : text(html.match(new RegExp(`id="${name}"[^>]*>([^<]*)<`))?.[1] ?? ''),
    );
    const checked = [...html.matchAll(/role="radio" aria-checked="true"[^>]*value="([^"]*)"/g)].map(([, v]) => v);

    expect(groups).toEqual(['How we spread the work', 'DCO sign-off, for repos that require it']);
    expect(checked).toEqual(['EVEN', 'ASK']);
    expect(html).not.toMatch(/<input[^>]*id="[^"]*-(pace|dco)-/);
  });

  it('puts the cycle cap and the pace first on the budget page, the rest folded with its values, and one Save', () => {
    const html = renderToStaticMarkup(<FormSettingsScreen page="budget" view={views.active} />);
    const plain = text(html);

    expect(html).toContain('data-fold="closed"');
    expect(html).toMatch(/aria-expanded="false"[^>]*>.*More limits/);
    expect(plain).toContain('no week cap · $15 a day · $5 an attempt · sweep 3 days · renews on the 14th');
    // Folded, still on the page: the draft and the labels stay.
    expect(html).toMatch(/<div id="[^"]*-more" hidden=""/);
    expect(html.match(/>Save</g)).toHaveLength(1);
  });

  it('puts the main model and effort first on the agent page, the smaller tasks folded, and one Save', () => {
    const html = renderToStaticMarkup(<FormSettingsScreen page="model" view={views.active} />);
    const plain = text(html);

    expect(plain).toContain('Models for smaller tasks');
    expect(plain).toContain(
      'Claude Haiku 5.5 (cheaper) runs tests and reads logs · writing tests: same as the main model',
    );
    expect(html).toMatch(/<div id="[^"]*-models" hidden=""/);
    expect(html.match(/>Save</g)).toHaveLength(1);
  });

  it('saves a page in one patch, or names the first field that is not a number', async () => {
    const { moreLimitsSummaryOf, pagePatchOf } = await import('@/components/workspace/settings/settings-form');
    const draft = {
      cycleCapUsd: '$200',
      weekCapUsd: '',
      dayCapUsd: '$15',
      attemptCapUsd: '$5',
      attemptsAtATime: '1',
      sweepDays: '3',
      maxChangedLines: '400',
      maxFiles: '15',
      openPrsAtATime: '3',
      pace: 'EVEN' as const,
      renewalDay: 14,
      mainModel: 'CLAUDE_SONNET_5_5' as const,
      helperModel: 'CLAUDE_HAIKU_5_5' as const,
      testModel: null,
      effort: 'MEDIUM' as const,
      dco: 'ASK' as const,
    };
    expect(pagePatchOf('budget', draft)).toEqual({
      patch: {
        cycleCapUsd: 200,
        weekCapUsd: null,
        dayCapUsd: 15,
        attemptCapUsd: 5,
        pace: 'EVEN',
        sweepDays: 3,
        renewalDay: 14,
      },
    });
    expect(pagePatchOf('model', draft)).toEqual({
      patch: {
        mainModel: 'CLAUDE_SONNET_5_5',
        helperModel: 'CLAUDE_HAIKU_5_5',
        testModel: null,
        effort: 'MEDIUM',
      },
    });
    expect(pagePatchOf('pull-requests', draft)).toEqual({
      patch: { maxChangedLines: 400, maxFiles: 15, openPrsAtATime: 3, attemptsAtATime: 1, dco: 'ASK' },
    });
    expect(pagePatchOf('budget', { ...draft, sweepDays: 'soon' })).toEqual({ invalid: 'Sweep days' });
    expect(pagePatchOf('pull-requests', { ...draft, maxFiles: '' })).toEqual({ invalid: 'Files' });

    // The fold's line says what was typed, even what Save will refuse.
    expect(moreLimitsSummaryOf(draft)).toBe(
      'no week cap · $15 a day · $5 an attempt · sweep 3 days · renews on the 14th',
    );
    expect(moreLimitsSummaryOf({ ...draft, weekCapUsd: 'abc', attemptCapUsd: '5', sweepDays: '1' })).toBe(
      'week cap “abc” · $15 a day · $5 an attempt · sweep 1 day · renews on the 14th',
    );
  });

  it('has no Pause and no Resume', () => {
    for (const view of [views.active, views.paused]) {
      expect(text(render(view))).not.toContain('Pause contributing');
      expect(text(render(view))).not.toContain('Resume');
    }
  });

  it('offers the two paces, the stored one checked', () => {
    const html = renderToStaticMarkup(<FormSettingsScreen page="budget" view={views.active} />);
    const checked = [...html.matchAll(/role="radio" aria-checked="true"[^>]*value="([^"]*)"/g)].map(([, v]) => v);
    const offered = [...html.matchAll(/role="radio"[^>]*value="([^"]*)"/g)].map(([, v]) => v);

    expect(checked).toEqual([settings.pace]);
    expect(offered.filter((value) => value === 'EVEN' || value === 'FAST').sort()).toEqual(['EVEN', 'FAST']);
    expect(text(html)).not.toContain('Only issues I queue');
  });

  it('shows the key and its state, and asks for one when there is none', () => {
    expect(render(views.active)).toContain('data-key-state="VALID"');
    expect(text(render(views.keyInvalid))).toContain('refused by Anthropic');
    // No key: the hosted agent says what it is, and Use a Claude key.
    expect(render(views.noKey)).toMatch(/data-hosted="pitch"[\s\S]*href="\/my\/agent\/key"[^>]*>Use a Claude key/);
    expect(pages(views.active)).toContain('data-key-state="VALID"');
    expect(text(pages(views.keyInvalid))).toContain('Connect a new key');
    expect(text(pages(views.exhausted))).toContain('credits used up until Nov 14');
    expect(text(pages(views.limitReached))).toContain('workspace limit reached until Nov 1');
    // With no key the key's page is where one is connected.
    expect(text(pages(views.noKey))).toContain('Connect your Claude key');
  });

  it('connects a missing grant and revokes a granted one', () => {
    expect(pages(views.grantMissing)).toContain('data-grant="missing"');
    expect(text(pages(views.grantMissing))).toContain('Allow on GitHub');
    expect(pages(views.active)).toContain('data-grant="connected"');
    expect(text(pages(views.active))).toContain('public_repo, as @octocat');
    expect(text(pages(views.active))).toContain('Revoke');
    expect(pages(views.fieldsMissing)).toContain('data-grant="unknown"');
  });

  it('says why a grant was refused, and where to revoke it on GitHub', () => {
    const wrongAccount = pages(views.grantMissing, 'refused');
    expect(wrongAccount).toContain('data-grant-refusal="refused"');
    expect(text(wrongAccount)).toContain('it must come from the GitHub account you are signed in with');
    expect(text(wrongAccount)).toContain('you may want to revoke it in Authorized OAuth Apps');
    expect(wrongAccount).toContain('href="https://github.com/settings/applications"');

    const unavailable = pages(views.grantMissing, 'unavailable');
    expect(text(unavailable)).toContain('pull request access is not available yet');
    expect(unavailable).toContain('href="https://github.com/settings/applications"');
  });

  it('offers no grant button while access cannot be granted here, and asks nothing about it', () => {
    const view = { ...views.grantMissing, grantAvailable: false };
    const html = pages(view);

    expect(html).toContain('data-grant-available="false"');
    expect(text(render(view))).toContain('GitHub access Not available yet. It is coming soon.');
    expect(text(html)).toContain('Not available yet. It is coming soon.');
    expect(text(html)).not.toContain('Allow on GitHub');
    expect(html).not.toContain('data-notice="grant-missing"');
  });

  it('locks autopilot until five merged pull requests, then lets the user choose it', () => {
    const locked = render(views.active);
    expect(locked).toContain('data-autopilot="locked"');
    expect(locked).toMatch(
      /role="radio"[^>]*value="AUTOPILOT"[^>]*disabled=""|role="radio"[^>]*disabled=""[^>]*value="AUTOPILOT"/,
    );

    const unlocked = render(views.autopilotUnlocked);
    expect(unlocked).toContain('data-autopilot="unlocked"');
    expect(unlocked).toMatch(/role="radio" aria-checked="true"[^>]*value="AUTOPILOT"/);
  });
});

const _ISSUE: ContributeIssue = {
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

describe('the heading scale', () => {
  it('gives the page title, a section and a part their own step, each above the text under it', async () => {
    const { HEADING, PageTitle, PanelTitle, SubTitle } = await import('@/components/workspace/primitives');
    const html = renderToStaticMarkup(
      <>
        <PageTitle title="Issues for you" text="42 open issues" />
        <PanelTitle title="Keys and access" eyebrow="Step 2" text="Your key" />
        <SubTitle>Set up your agent</SubTitle>
      </>,
    );

    expect(html).toContain(`<h1 class="${HEADING.page}">Issues for you</h1>`);
    expect(html).toContain(`<h2 class="${HEADING.section}">Keys and access</h2>`);
    expect(html).toContain(`<h3 class="${HEADING.block}">Set up your agent</h3>`);
    expect(text(html)).toContain('Step 2 Keys and access');
    expect(new Set(Object.values(HEADING)).size).toBe(4);
  });

  it('heads Settings with section headings at the section step', async () => {
    const { HEADING } = await import('@/components/workspace/primitives');

    const settings = renderToStaticMarkup(<SettingsScreen view={views.active} />);
    expect(settings).toContain(`<h1 class="${HEADING.page}">Settings</h1>`);
    expect(settings).toContain(`class="${HEADING.block}">Contribute preferences</h2>`);
    const agent = renderToStaticMarkup(<AgentScreen view={views.active} now={NOW} />);
    expect(agent).toContain(`<h1 class="${HEADING.page}">Agent</h1>`);
    expect(agent).toContain(`class="${HEADING.section}">Hosted agent</h2>`);
    const budget = renderToStaticMarkup(<FormSettingsScreen page="budget" view={views.active} />);
    expect(budget).toContain(`<h1 class="${HEADING.page}">Budget and pacing</h1>`);
    expect(renderToStaticMarkup(<PullRequestsSettingsScreen view={views.active} />)).toContain(
      `<h2 class="${HEADING.block}">Pull request size</h2>`,
    );
    expect(renderToStaticMarkup(<KeyScreen view={views.active} today={30} now={NOW} />)).toContain(
      `<h1 class="${HEADING.page}">Claude API key</h1>`,
    );
  });
});

describe('the confirms before what cannot be undone', () => {
  it('open from Remove key, Revoke (GitHub) and Revoke (token), which act only from the dialog', () => {
    const view = { ...views.active, ownAgent: { paths: { hosted: true, mcp: true }, tokens: [mcpToken()] } };
    const html = renderToStaticMarkup(
      <>
        <KeyScreen view={view} today={30} now={NOW} />
        <GithubSettingsScreen view={view} />
        <AgentScreen view={view} now={NOW} />
      </>,
    );
    const triggersOf = (markup: string) =>
      [...markup.matchAll(/<button[^>]*aria-haspopup="dialog"[^>]*>(.*?)<\/button>/g)].map(([, label]) =>
        text(label).trim(),
      );

    expect(triggersOf(html)).toEqual(['Remove key', 'Revoke', 'Revoke Claude Code on macOS', 'How autopilot works']);
    expect(text(html)).not.toContain('Yes, remove it');
    // The Settings tab acts on none of them: each row opens its page.
    expect(triggersOf(renderToStaticMarkup(<SettingsScreen view={view} />))).toEqual([]);
  });
});

describe('the access level', () => {
  it("tells a new account its smaller limits, with the numbers from the API, and that it isn't a judgement", () => {
    const html = notices(views.newAccount);

    expect(html).toContain('data-notice="new-account"');
    expect(html).toContain('bg-brand-soft');
    expect(text(html)).toContain(
      "Smaller limits while your account is new Contribute starts new accounts on smaller limits: 1 issue at a time, 3 new claims a day and 40 new issues a day in this list. Every new account starts this way, to keep automated accounts from claiming issues meant for people; it isn't a judgement of you. The limits lift on their own as your account builds a track record.",
    );
    expect(html).toContain('<span class="font-mono tabular-nums text-foreground">40</span>');
  });

  it('says the counts as the API sets them, one or many', () => {
    const wider = { ...limits.newAccount, attemptsAtATime: 2, claimsPerDay: 1, revealsPerDay: 1500 };
    const view = { ...views.newAccount, contributor: { ...views.newAccount.contributor, limits: wider } };

    expect(text(notices(view))).toContain('2 issues at a time, 1 new claim a day and 1,500 new issues a day');
  });

  it('warns of lower limits after claims ran out, and of a paused account with the address to write to', () => {
    const followThrough = notices(views.followThrough);
    expect(followThrough).toContain('data-notice="follow-through"');
    expect(followThrough).toContain('bg-warning-soft');
    expect(text(followThrough)).toContain(
      "Your limits are lower for now Most of your recent claims ran out without a pull request, and each one kept the issue from other contributors. For now Contribute holds you to 1 issue at a time and 3 new claims a day. Release an issue you won't finish instead of letting it run out; the limits come back as your claims turn into pull requests.",
    );

    const suspended = notices(views.suspended);
    expect(suspended).toContain('data-notice="suspended"');
    expect(suspended).toContain('bg-warning-soft');
    expect(suspended).toContain('href="mailto:hello@gitranks.com"');
    expect(text(suspended)).toContain(
      "Contribute is paused for this account Activity on this account looks automated, so it can't see or claim issues for now. If we got this wrong, write to hello@gitranks.com and we'll look at it.",
    );
  });

  it("says the attempts the limit holds on Settings' row, below the setting alone", () => {
    expect(text(renderToStaticMarkup(<SettingsScreen view={views.newAccount} />))).toContain(
      'Attempts at a time 1 issue in work at once while your account is new',
    );
    expect(text(renderToStaticMarkup(<SettingsScreen view={views.followThrough} />))).toContain(
      'Attempts at a time 1 issue in work at once for now',
    );
    expect(text(renderToStaticMarkup(<SettingsScreen view={views.active} />))).toContain(
      'Attempts at a time 1 issue in work at once Edit',
    );
  });

  it('caps attempts and open PRs at a time on their pages, with the hint tied to the field', () => {
    const prs = renderToStaticMarkup(<PullRequestsSettingsScreen view={views.newAccount} />);
    expect(text(prs)).toContain('Attempts at a time Up to 1 while your account is new');
    expect(prs).toMatch(/aria-describedby="([^"]*attemptsAtATime-hint)"[^>]*>.*id="\1"/s);

    const agent = renderToStaticMarkup(<PullRequestsSettingsScreen view={views.followThrough} />);
    expect(text(agent)).toContain('Open PRs at a time Up to 2 for now');

    const standard = renderToStaticMarkup(<PullRequestsSettingsScreen view={views.active} />);
    expect(standard).not.toContain('data-cap-hint');
  });

  it('shows an open PRs limit set for the account in place of the setting, not to be edited', () => {
    const view = { ...views.active, contributor: { ...views.active.contributor, limits: limits.openPrsSet } };
    const agent = renderToStaticMarkup(<PullRequestsSettingsScreen view={view} />);
    expect(text(agent)).toContain('Open PRs at a time Set for your account by GitRanks.');
    expect(agent).toMatch(/readOnly=""[^>]*value="16"|value="16"[^>]*readOnly=""/);
    expect(agent).toMatch(/aria-describedby="([^"]*openPrsAtATime-hint)"[^>]*>.*id="\1"/s);
    expect(text(agent)).not.toContain('Up to');
  });

  it('refuses a value typed above the cap on save, and keeps the stored one', async () => {
    const { pagePatchOf } = await import('@/components/workspace/settings/settings-form');
    const draft = {
      cycleCapUsd: '$200',
      weekCapUsd: '',
      dayCapUsd: '$15',
      attemptCapUsd: '$5',
      attemptsAtATime: '2',
      sweepDays: '3',
      maxChangedLines: '400',
      maxFiles: '15',
      openPrsAtATime: '3',
      pace: 'EVEN' as const,
      renewalDay: 14,
      mainModel: 'CLAUDE_SONNET_5_5' as const,
      helperModel: 'CLAUDE_HAIKU_5_5' as const,
      testModel: null,
      effort: 'MEDIUM' as const,
      dco: 'ASK' as const,
    };
    const caps = { limits: limits.newAccount, stored: { attemptsAtATime: 1, openPrsAtATime: 3 } };

    expect(pagePatchOf('pull-requests', draft, caps)).toEqual({
      invalid: 'Attempts at a time',
      message: 'Attempts at a time: up to 1 while your account is new.',
    });
    // Open PRs at 3 is as stored: kept for when the limit lifts.
    expect(pagePatchOf('pull-requests', { ...draft, attemptsAtATime: '1' }, caps)).toMatchObject({
      patch: { openPrsAtATime: 3 },
    });
    expect(pagePatchOf('pull-requests', { ...draft, attemptsAtATime: '1', openPrsAtATime: '4' }, caps)).toMatchObject({
      message: 'Open PRs at a time: up to 2 while your account is new.',
    });
    expect(pagePatchOf('pull-requests', { ...draft, attemptsAtATime: '1' }, caps)).toMatchObject({
      patch: { attemptsAtATime: 1 },
    });
    expect(pagePatchOf('pull-requests', draft)).toMatchObject({ patch: { attemptsAtATime: 2 } });

    // A limit set for the account is never saved as the setting: the stored one goes back as it is.
    const stored = { attemptsAtATime: 2, openPrsAtATime: 3 };
    const set = pagePatchOf('pull-requests', draft, { limits: limits.openPrsSet, stored });
    expect(set).toMatchObject({ patch: { openPrsAtATime: 3 } });
    expect(set).not.toHaveProperty('invalid');
    // On smaller limits too, with the stored value above the level's cap: kept, and not refused.
    const reduced = { ...limits.newAccount, openPrsEffective: 16, openPrsOverride: 16 };
    const small = pagePatchOf('pull-requests', { ...draft, attemptsAtATime: '1' }, { limits: reduced, stored });
    expect(small).toMatchObject({ patch: { openPrsAtATime: 3 } });
    expect(small).not.toHaveProperty('invalid');
  });
});
