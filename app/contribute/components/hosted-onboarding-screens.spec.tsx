import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/contribute',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
vi.mock('@/lib/workspace/actions', () => ({}));
vi.mock('@/lib/contribute/actions', () => ({}));
vi.mock('@/lib/workspace/issue-actions', () => ({}));
vi.mock('@/lib/workspace/contribute.data', () => ({ loadContribute: vi.fn(), loadIssues: vi.fn() }));
vi.mock('@/lib/contribute/contribute.data', () => ({ loadIssues: vi.fn() }));

const { KeyConnect } = await import('@/components/workspace/agent/key-connect');
const { LimitsManual } = await import('@/components/workspace/settings/limits-manual');
const { Matching } = await import('@/components/workspace/matching');

const { ReviewScreen, grantNeededOf } = await import('@/components/workspace/pull-request/review-view');
const { NOW, settings, views } = await import('@/lib/contribute/__fixtures__/contribute-views');
const { detail } = await import('@/lib/contribute/__fixtures__/contribute-attempts');
const { manualDraftOf } = await import('@/lib/workspace/connect-limits');

import type { ContributeIssuePage, ContributeView } from '@/lib/workspace/contribute.types';

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
const _page: ContributeIssuePage = {
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
    expect(text(html)).toContain("Each run can't be more than each day ($3): no run could start.");
  });

  it('asks for the month when it is left empty', () => {
    const html = render({ month: '' });

    expect(html).toMatch(/id="l-month"[^>]*aria-invalid="true"[^>]*aria-describedby="l-month-hint l-summary"/);
    expect(text(html)).toContain('Set a monthly amount to continue.');
    expect(render()).toMatch(/id="l-month"[^>]*aria-describedby="l-month-hint"/);
  });

  it('offers no "only issues I queue" pace: starting issues is the hosted agent\'s level', () => {
    const html = render();

    expect(html).not.toContain('data-pace="queued"');
    expect(text(html)).not.toContain('only on issues you queue');
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
      settings: { ...settings, cycleCapUsd: 150, attemptCapUsd: 3, pace: 'EVEN' as const },
    };
    const plain = text(
      renderToStaticMarkup(<KeyConnect defaultPlan="MAX_5X" stored={stored} guessDay={30} replacing />),
    );

    expect(plain).toContain('Your limits and picks stay as they are');
    expect(plain).toContain('at most $150, your monthly cap as it is');
    expect(plain).toContain('at most $3, it stops at the cap');
    expect(plain).toContain('spread across your month');
    expect(plain).not.toContain('only on issues you queue');
    expect(plain).not.toContain("the Max plan's monthly allowance");
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
    expect(html).toContain('href="/contribute/start/issue"');
    expect(plain).toContain('Pick one and press Start.');
    expect(plain).toContain('See my issues');
  });
});

describe('A4, GitHub access at the first submit', () => {
  const review = (view: ContributeView, attempt = detail()) =>
    renderToStaticMarkup(<ReviewScreen view={view} attempt={attempt} now={NOW} />);

  it('asks for public_repo from the submit button while the grant is not connected', () => {
    const html = review(views.firstKey);
    const plain = text(html);

    expect(html).toContain('data-grant-ask');
    expect(plain).toContain('GitHub asks you once for one permission, public_repo');
    expect(plain).toContain('never on private repos or workflow files');
    expect(plain).toContain('You come back here and the PR opens.');
    expect(plain).toContain('Allow GitHub access and open the PR');
    expect(plain).not.toContain('Submit pull request');
    expect(plain).not.toContain('This is your first one');
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
    // Access not connected: the grant card, the form open with the page.
    const again = review(views.firstKey, bounced);
    expect(again).toContain('data-submit-panel="open"');
    expect(again).toContain('data-move="grant"');
    expect(text(again)).toContain('Allow GitHub access to open the pull request');
    expect(text(again)).toContain('GitHub asks you once more for public_repo.');
    expect(text(again)).not.toContain('GitHub access for pull requests is not connected');
    // The bounce's note is the card's to say, once.
    expect(text(again).match(/Allow it again from this page\./g)).toHaveLength(1);
    const errorAt = again.indexOf('data-submit-error');
    const noteAt = again.indexOf('Allow it again from this page.');
    expect(errorAt).toBeGreaterThan(-1);
    expect(noteAt).toBeGreaterThan(errorAt);
    // Said in the card, not again inside the form that follows it.
    expect(noteAt).toBeLessThan(again.indexOf('data-pr-form'));
    // The form is open: the card draws no primary, the form's Submit is the one.
    const head = again.slice(again.indexOf('data-session-head'), again.indexOf('data-pr-form'));
    expect(head).not.toContain('data-variant="default"');
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
