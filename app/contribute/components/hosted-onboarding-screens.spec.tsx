import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute/issues',
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
vi.mock('@/app/contribute/actions', () => ({}));
vi.mock('./live-refresh', () => ({ LiveRefresh: () => <span data-live-refresh /> }));
vi.mock('@/lib/contribute/contribute.data', () => ({ loadContribute: vi.fn(), loadIssues: vi.fn() }));

const { KeyConnect } = await import('./key-connect');
const { LimitsManual } = await import('./limits-manual');
const { Matching } = await import('./matching');
const { FirstRunGuide } = await import('./first-run-guide');
const { IssuesScreen } = await import('./issues-view');
const { OverviewScreen } = await import('./overview-status');
const { ReviewScreen, grantNeededOf } = await import('./review-view');
const { NOW, firstSpend, key, settings, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { detail } = await import('@/lib/contribute/__fixtures__/contribute-attempts');
const { manualDraftOf } = await import('@/lib/contribute/connect-limits');

import type { ContributeIssuePage, ContributeView } from '@/lib/contribute/contribute.types';

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ');

const ISSUE = {
  issueId: 'I_1',
  repositoryId: 'R_1',
  nameWithOwner: 'fern-lang/fern',
  number: 2481,
  url: 'https://github.com/fern-lang/fern/issues/2481',
  title: 'Formatter drops a trailing comment in match arms',
  labels: [],
  language: 'RUST' as const,
  kind: 'BUG' as const,
  size: 'S' as const,
  score: 0.9,
  rank: 1,
  why: 'you write Rust',
};
const page: ContributeIssuePage = {
  items: [ISSUE, { ...ISSUE, issueId: 'I_2', number: 918, rank: 2 }],
  next: null,
  total: 2,
  computedAt: '2026-10-28T11:59:00.000Z',
};

describe('A1, "I\'ll set them myself"', () => {
  const render = (patch: Parameters<typeof manualDraftOf>[0] = {}) =>
    renderToStaticMarkup(<LimitsManual id="l" draft={manualDraftOf(patch)} onChange={() => {}} />);

  it('asks for the month, the optional caps and the pace, with a live line of what they add up to', () => {
    const html = render();
    const plain = text(html);

    expect(plain).toContain('Each month · required');
    expect(html).toContain('value="50"');
    expect(html).toContain('value="5"');
    expect(html.match(/placeholder="No cap"/g)).toHaveLength(2);
    expect(html).toMatch(/aria-pressed="true"[^>]*>.*Spread across the month/);
    expect(plain).toContain('As fast as the caps allow');
    expect(html).toContain('data-limits-summary="ok"');
    expect(plain).toContain('At most $50 a month and $5 an attempt, spread across your month.');
  });

  it('says inline when the attempt cap is above a cap that is set, and marks the field', () => {
    const html = render({ day: '3' });

    expect(html).toContain('data-limits-summary="attempt"');
    expect(html).toMatch(/id="l-attempt"[^>]*aria-invalid="true"[^>]*aria-describedby="l-summary"/);
    expect(html).toMatch(/id="l-summary"[^>]*data-limits-summary="attempt"/);
    // Only the refused field points at the message.
    expect(html).not.toMatch(/id="l-day"[^>]*aria-describedby/);
    // The line under the fields is not live: it changes on every keystroke.
    expect(html).not.toMatch(/role="status"[^>]*data-limits-summary/);
    expect(text(html)).toContain("Each attempt can't be more than each day ($3): no attempt could start.");
  });

  it('asks for the month when it is left empty', () => {
    const html = render({ month: '' });

    expect(html).toMatch(/id="l-month"[^>]*aria-invalid="true"[^>]*aria-describedby="l-month-hint l-summary"/);
    expect(text(html)).toContain('Set a monthly amount to continue.');
    expect(render()).toMatch(/id="l-month"[^>]*aria-describedby="l-month-hint"/);
  });

  it('keeps a QUEUED pace from the stored settings, with neither card picked', () => {
    const html = render({ pace: 'QUEUED' });

    expect(html).not.toContain('aria-pressed="true"');
    expect(html).toContain('data-pace="queued"');
    expect(text(html)).toContain('only on issues you queue');
  });

  it('opens with the hand-set limits for a key connected with them, and sums them up in what we apply', () => {
    const html = renderToStaticMarkup(
      <KeyConnect defaultPlan="CREDITS" defaultManual={{ month: '80', week: '20' }} guessDay={30} />,
    );
    const plain = text(html);

    expect(html).toMatch(/aria-pressed="true"[^>]*>I&#x27;ll set them myself/);
    expect(html).toContain('data-limits-applied="manual"');
    expect(plain).toContain('at most $80, the amount you set');
    expect(plain).toContain('$20 a week: the smallest cap wins');
    expect(html).toMatch(/type="submit" disabled=""[^>]*aria-describedby="[^"]+-why"/);
    expect(plain).toContain('To continue, tick the box in step 1, then paste your key in step 2.');
  });

  it('says on a replace the limits as they are stored, not the defaults', () => {
    const stored = {
      plan: 'MAX_5X' as const,
      settings: { ...settings, cycleCapUsd: 150, attemptCapUsd: 3, pace: 'QUEUED' as const },
    };
    const plain = text(
      renderToStaticMarkup(<KeyConnect defaultPlan="MAX_5X" stored={stored} guessDay={30} replacing />),
    );

    expect(plain).toContain('Your limits and picks stay as they are');
    expect(plain).toContain('at most $150, your monthly cap as it is');
    expect(plain).toContain('at most $3, it stops at the cap');
    expect(plain).toContain('only on issues you queue');
    expect(plain).not.toContain("Max 5x's monthly allowance");
  });
});

describe('A2, matching', () => {
  it('starts on the first line, as a live list, with the headline focusable', () => {
    const html = renderToStaticMarkup(<Matching languages={['Rust', 'TypeScript', 'Go']} />);
    const plain = text(html);

    expect(html).toContain('data-matching="working"');
    expect(html).toMatch(/<h1[^>]*tabindex="-1"[^>]*>Matching you with issues<\/h1>/);
    expect(html).toContain('aria-live="polite"');
    expect(html.match(/data-line=/g)).toHaveLength(1);
    expect(plain).toContain('Your key works, and your plan is set');
    for (const language of ['Rust', 'TypeScript', 'Go']) expect(plain).toContain(language);
    expect(plain).not.toContain('See my issues');
    // Motion is only ever on under motion-safe.
    expect(html).not.toMatch(/(?<!motion-safe:)animate-(contribute|spin)/);
  });

  it('ends with the first issues ready and the way to them', () => {
    const html = renderToStaticMarkup(<Matching languages={[]} initialTicks={4} />);
    const plain = text(html);

    expect(html).toContain('data-matching="done"');
    expect(plain).toContain('Your first issues are ready');
    expect(html.match(/data-line="done"/g)).toHaveLength(4);
    expect(html).toContain('href="/contribute/issues"');
    expect(plain).toContain('See my issues');
  });
});

describe('A3, what happens next before the first attempt', () => {
  const guide = (view: ContributeView, feed: ContributeIssuePage | null | undefined = page) =>
    renderToStaticMarkup(<FirstRunGuide view={view} page={feed} now={NOW} />);
  const spend = firstSpend;
  const withContributor = (patch: Partial<NonNullable<ContributeView['contributor']>>): ContributeView => ({
    ...views.firstKey,
    contributor: { ...views.firstKey.contributor, ...patch },
  });

  it.each([
    [
      'closed',
      { ...views.firstKey, attemptsOpen: false },
      'Your agent will start on one of your top picks when Contribute opens',
    ],
    ['paused', { ...withContributor({ status: 'PAUSED' }), paused: true }, 'Contributing is paused'],
    [
      'key-waiting',
      withContributor({ credentials: [key({ state: 'EXHAUSTED', blockedUntil: '2026-11-14T00:00:00.000Z' })] }),
      'Your agent starts on Nov 14',
    ],
    [
      'no-room',
      withContributor({ spend: { ...spend, nextAttemptAt: null } }),
      'Your caps leave no room for one attempt',
    ],
    [
      'paced',
      withContributor({ spend: { ...spend, nextAttemptAt: '2026-10-30T12:00:00.000Z' } }),
      'Your agent starts on one of your top picks in 2 days',
    ],
    ['soon', views.firstKey, 'Your agent starts on one of your top picks'],
  ] as const)('step 1 says when it is %s', (kind, view, title) => {
    const html = guide(view);

    expect(html).toContain(`data-first-run="${kind}"`);
    expect(text(html)).toContain(title);
  });

  it('says the picks are still being found while the feed is empty', () => {
    expect(text(guide(views.firstKey, { ...page, items: [], total: 0 }))).toContain(
      "We're still finding issues for you",
    );
  });

  it('starts "usually within minutes", on the key, and never names an issue', () => {
    const plain = text(guide(views.firstKey));

    expect(plain).toContain('1 · next, usually within minutes');
    expect(plain).toContain('within your per-attempt cap ($5)');
    expect(plain).not.toContain(ISSUE.title);
    expect(plain).toContain('Nothing for you to do until step 2');
    expect(plain).toContain('You review the change');
    expect(plain).toContain('The first time, GitHub asks you for one permission');
  });

  it('offers Resume to a paused contributor, and Settings to one whose caps leave no room', () => {
    const paused = guide({ ...withContributor({ status: 'PAUSED' }), paused: true });
    expect(paused).toContain('data-paused="true"');
    expect(text(paused)).not.toContain('Nothing for you to do');

    expect(guide(withContributor({ spend: { ...spend, nextAttemptAt: null } }))).toContain(
      'href="/contribute/settings#limits"',
    );
  });

  it('says what we guessed, from the settings as they are, with the way to change it', () => {
    const html = guide(views.firstKey);

    expect(text(html)).toContain(
      "We guessed what you'd like: every kind and size of issue, your profile's languages first, within your $100 monthly cap, paced across your cycle.",
    );
    expect(html).toContain('href="/contribute/settings#work"');
    expect(text(guide(views.active))).toContain('bugs, Rust first, within your $200 monthly cap');
  });

  it('opens Issues, with the picks under it and the best match marked', () => {
    const html = renderToStaticMarkup(<IssuesScreen view={views.firstKey} page={page} query={{}} now={NOW} firstRun />);
    const plain = text(html);

    expect(html).toMatch(/<h1[^>]*>You&#x27;re in. Here&#x27;s what happens next<\/h1>/);
    expect(html).toMatch(/<h2[^>]*>Picked for you<\/h2>/);
    expect(plain.indexOf("You're in")).toBeLessThan(plain.indexOf('Picked for you'));
    expect(html.match(/data-best="true"/g)).toHaveLength(1);
    expect(plain).toContain('Best match');
  });

  it('leaves out only the notice step 1 restates, and keeps every other block', () => {
    const paused = { ...views.firstKey.contributor, status: 'PAUSED' as const };
    const exhausted = { credentials: [key({ state: 'EXHAUSTED', blockedUntil: '2026-11-14T00:00:00.000Z' })] };
    const issues = (view: ContributeView) =>
      renderToStaticMarkup(<IssuesScreen view={view} page={page} query={{}} now={NOW} firstRun />);
    const overview = (view: ContributeView) =>
      renderToStaticMarkup(<OverviewScreen view={view} now={NOW} firstRun={{ page }} />);

    for (const render of [issues, overview]) {
      // Paused alone: step 1 says it, the notice goes.
      const pausedOnly = render({ ...views.firstKey, contributor: paused, paused: true });
      expect(pausedOnly).toContain('data-first-run="paused"');
      expect(pausedOnly).not.toContain('data-notice="paused"');

      // Paused and used up: step 1 says the pause, the notice says the key.
      const both = render({ ...views.firstKey, contributor: { ...paused, ...exhausted }, paused: true });
      expect(both).toContain('data-first-run="paused"');
      expect(both).toContain('data-notice="exhausted"');
      expect(both).not.toContain('data-notice="paused"');

      // Attempts closed: step 1 says so, and every block is still said above it.
      const closed = render({
        ...views.firstKey,
        contributor: { ...paused, ...exhausted },
        paused: true,
        attemptsOpen: false,
      });
      expect(closed).toContain('data-first-run="closed"');
      expect(closed).toContain('data-notice="paused"');
      expect(closed).toContain('data-notice="exhausted"');
      const limit = render({
        ...views.firstKey,
        contributor: {
          ...views.firstKey.contributor,
          credentials: [key({ state: 'LIMIT_REACHED', blockedUntil: null })],
        },
        attemptsOpen: false,
      });
      expect(limit).toContain('data-notice="limit-reached"');
    }
  });

  it('says a key that stopped working, and the way to a new one, never "usually within minutes"', () => {
    const invalid = {
      ...views.firstKey,
      contributor: { ...views.firstKey.contributor, credentials: [key({ state: 'INVALID' })] },
    };
    const html = renderToStaticMarkup(<IssuesScreen view={invalid} page={page} query={{}} now={NOW} firstRun />);
    const plain = text(html);

    expect(html).toContain('data-first-run="key-invalid"');
    expect(plain).toContain('Your key stopped working');
    expect(html).toContain('href="/contribute/connect"');
    expect(plain).not.toContain('usually within minutes');
    expect(plain).not.toContain('Nothing for you to do');
    // Step 1 says it: the notice is not said twice.
    expect(html).not.toContain('data-notice="key-invalid"');
  });

  it('takes the place of the status on Overview, and gives way to it once there is an attempt', () => {
    const first = renderToStaticMarkup(<OverviewScreen view={views.firstKey} now={NOW} firstRun={{ page }} />);
    expect(first).toContain('data-first-run="soon"');
    expect(text(first)).not.toContain('used this cycle');

    const later = renderToStaticMarkup(<OverviewScreen view={views.firstKey} now={NOW} />);
    expect(later).not.toContain('data-first-run');
    expect(text(later)).toContain('used this cycle');
  });
});

describe('A4, GitHub access at the first submit', () => {
  const review = (view: ContributeView, attempt = detail()) =>
    renderToStaticMarkup(<ReviewScreen view={view} attempt={attempt} now={NOW} />);

  it('asks for public_repo from the submit button while the grant is not connected', () => {
    const html = review(views.firstKey);
    const plain = text(html);

    expect(html).toContain('data-grant-ask');
    expect(plain).toContain('This is your first one, so GitHub asks you once to let us open PRs as you.');
    expect(plain).toContain('public_repo');
    expect(plain).toContain('never private repos, never workflow files');
    expect(plain).toContain('Allow GitHub access and open the PR');
    expect(plain).toContain('You come back here and the PR opens straight away.');
    expect(plain).not.toContain('Submit pull request');
  });

  it('is the plain submit once the grant is connected, or while it cannot be granted or is not answered', () => {
    for (const view of [views.active, { ...views.firstKey, grantAvailable: false }, views.fieldsMissing]) {
      const plain = text(review(view));
      expect(plain).toContain('Submit pull request');
      expect(plain).not.toContain('Allow GitHub access');
    }
  });

  it('asks again when the last submit bounced for want of the grant', () => {
    const bounced = detail({
      submit: {
        step: 'QUEUED',
        waitUntil: null,
        fork: null,
        branch: null,
        lastError: { reason: 'grant_revoked', note: 'Allow it again from this page.', at: '2026-10-28T11:00:00.000Z' },
      },
    });

    expect(grantNeededOf(views.active, bounced)).toBe(true);
    expect(text(review(views.active, bounced))).toContain('GitHub asks you once more');
    expect(grantNeededOf(views.active, detail())).toBe(false);
    // A grant missing at the submit and connected since asks no more.
    const missing = detail({
      submit: {
        step: 'QUEUED',
        waitUntil: null,
        fork: null,
        branch: null,
        lastError: { reason: 'grant_missing', note: 'Allow it from this page.', at: '2026-10-28T11:00:00.000Z' },
      },
    });
    expect(grantNeededOf(views.active, missing)).toBe(false);
    expect(grantNeededOf(views.firstKey, missing)).toBe(true);
  });
});

describe('the first picks still being ranked', () => {
  it('reads the page again for about two minutes, then stops', async () => {
    const { rankingTickOf, RANKING_REFRESH_FOR_SECONDS } = await import('./still-ranking');

    expect(RANKING_REFRESH_FOR_SECONDS).toBe(120);
    expect(rankingTickOf(0, 5_000)).toBe('refresh');
    expect(rankingTickOf(0, 115_000)).toBe('refresh');
    expect(rankingTickOf(0, 120_000)).toBe('stop');
  });
});
