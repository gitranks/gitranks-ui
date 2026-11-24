// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/learn/issues.actions', () => ({ setLearnIssuesEmailAction: vi.fn(), readMoreLearnFixes: vi.fn() }));
vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));

import { type MyFixesRead, type MyWalkthroughsRead, ProgressBody, type ViewList } from './my-progress-live';
import {
  historyWithFixes,
  myFixes,
  myProgress,
  myProgressWithFixes,
  myWalkthroughs,
  PROGRESS_TODAY,
} from '@/lib/learn/__fixtures__/my-progress';
import type { LearnMyProgress, MyProgressView } from '@/lib/learn/my-progress';

const LONG_DASH = String.fromCodePoint(0x2014);
const NO_END = { openIssues: null, email: null };

function body({
  view,
  progress = myProgress,
  fixes = null,
  walkthroughs = null,
}: {
  view: MyProgressView;
  progress?: LearnMyProgress;
  fixes?: ViewList<MyFixesRead> | null;
  walkthroughs?: ViewList<MyWalkthroughsRead> | null;
}) {
  const page = document.createElement('div');
  page.innerHTML = renderToStaticMarkup(
    <ProgressBody
      progress={progress}
      today={PROGRESS_TODAY}
      view={view}
      history={{ kind: 'ready', from: null, days: historyWithFixes.days, more: 'end', focus: null }}
      onMore={() => {}}
      onHistoryReload={() => {}}
      fixes={fixes}
      walkthroughs={walkthroughs}
    />,
  );
  return page;
}

const ready = <T,>(read: T): ViewList<T> => ({ kind: 'ready', read });
const hrefs = (page: Element, selector: string) =>
  [...page.querySelectorAll(selector)].map((link) => link.getAttribute('href'));

describe('My progress: Your fixes', () => {
  const page = body({ view: 'fixes', fixes: ready({ fixes: myFixes, end: NO_END }) });

  it('says how many were merged in how many projects, and how many are open and closed', () => {
    expect(page.querySelector('[data-view-line]')?.textContent).toBe('3 merged in 3 projects · 1 open · 1 closed');
  });

  it("lists each fix with its pull request's state, and leads to the person's own pull request page", () => {
    const rows = page.querySelectorAll('[data-my-fixes] > li');
    expect(rows).toHaveLength(5);
    expect([...page.querySelectorAll('[data-fix-state]')].map((pill) => pill.getAttribute('data-fix-state'))).toEqual([
      'OPEN',
      'MERGED',
      'MERGED',
      'MERGED',
      'CLOSED',
    ]);
    expect(rows[0].textContent).toContain('open, in review');
    expect(rows[0].textContent).toContain('It becomes Mastered when the fix is merged.');
    expect(rows[1].textContent).toContain('It is Mastered now.');
    expect(rows[1].textContent).toContain('3 people read your walkthrough.');
    expect(hrefs(rows[1], 'a')).toContain('/my/pull-requests/acme/widgets/42?from=learn');
    expect(rows[1].textContent).toContain('Open your fix');
  });

  it('with nothing in it: the issues that fit, the email for one when none does, or Issues when neither is known', () => {
    const issues = body({ view: 'fixes', fixes: ready({ fixes: [], end: { openIssues: 12, email: null } }) });
    expect(issues.querySelector('[data-view-empty]')?.getAttribute('data-view-empty')).toBe('fixes-issues');
    expect(issues.textContent).toContain('12 open issues fit you now.');
    expect(hrefs(issues, '[data-view-empty] a')).toEqual(['/learn/issues']);
    const email = body({
      view: 'fixes',
      fixes: ready({ fixes: [], end: { openIssues: 0, email: { emailOn: false, emailTo: 'mona@example.com' } } }),
    });
    expect(email.querySelector('[data-view-empty]')?.getAttribute('data-view-empty')).toBe('fixes-email');
    expect(email.textContent).toContain('No open issue fits you right now.');
    const plain = body({ view: 'fixes', fixes: ready({ fixes: [], end: NO_END }) });
    expect(plain.querySelector('[data-view-empty]')?.getAttribute('data-view-empty')).toBe('fixes');
    expect(plain.querySelector('[data-view-line]')?.textContent ?? '').toBe('');
  });

  it('while its list is on its way, and when it did not come', () => {
    expect(body({ view: 'fixes' }).querySelector('[data-view-list="pending"]')).not.toBeNull();
    const failed = body({ view: 'fixes', fixes: { kind: 'failed' } });
    expect(failed.querySelector('[data-view-list="failed"]')?.textContent).toContain('Your fixes did not load.');
    expect(failed.querySelector('[data-view-list="failed"] button')?.textContent).toBe('Try again');
  });
});

describe('My progress: Walkthroughs', () => {
  const page = body({ view: 'walkthroughs', walkthroughs: ready({ walkthroughs: myWalkthroughs, fixes: 5 }) });

  it("counts the walkthroughs of other people's fixes passed, and lists each with its fixer", () => {
    expect(page.querySelector('[data-view-line]')?.textContent).toBe('2 walkthroughs of other people’s fixes passed');
    const rows = page.querySelectorAll('[data-my-walkthroughs] > li');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('fixed by mona-lisa');
    expect(hrefs(rows[0], 'a')).toContain('/learn/fixes/vitejs/vite/18020');
    expect(hrefs(rows[0], 'a')).toContain('/learn/fixes/vitejs/vite/18020/walkthrough');
    expect(rows[0].textContent).toContain('Open it again');
  });

  it('with nothing in it: the fixed issues when there are some, else no button', () => {
    const some = body({ view: 'walkthroughs', walkthroughs: ready({ walkthroughs: [], fixes: 5 }) });
    expect(some.textContent).toContain('5 fixes have one.');
    expect(some.querySelectorAll('[data-view-empty] a')).toHaveLength(1);
    const none = body({ view: 'walkthroughs', walkthroughs: ready({ walkthroughs: [], fixes: null }) });
    expect(none.textContent).toContain('The first ones appear as fixes get merged.');
    expect(none.querySelectorAll('[data-view-empty] a')).toHaveLength(0);
  });

  it('when its list did not come', () => {
    const failed = body({ view: 'walkthroughs', walkthroughs: { kind: 'failed' } });
    expect(failed.querySelector('[data-view-list="failed"]')?.textContent).toContain('Your walkthroughs did not load.');
  });
});

describe('My progress: a day with a fix or a walkthrough', () => {
  it("draws History's fix line first, to the person's pull request, with the lesson it made Mastered", () => {
    const page = body({ view: 'history' });
    const friday = page.querySelector('[data-history-day="2026-11-20"]')!;
    expect([...friday.querySelectorAll('[data-entry]')].map((line) => line.getAttribute('data-entry'))).toEqual([
      'fix',
      'lessons',
    ]);
    const fix = friday.querySelector('[data-entry="fix"]')!;
    expect(fix.textContent).toContain('was merged');
    expect(fix.textContent).toContain('is Mastered now.');
    expect(hrefs(fix, 'a')[0]).toBe('/my/pull-requests/acme/widgets/42?from=learn');
    const walkthrough = page.querySelector('[data-history-day="2026-11-21"] [data-entry="walkthrough"]')!;
    expect(walkthrough.textContent).toContain('vitejs/vite, a fix by mona-lisa.');
    expect(hrefs(walkthrough, 'a')).toEqual(['/learn/fixes/vitejs/vite/18020']);
  });

  it('rings the square of the day a fix was merged, and its card says so', () => {
    const page = body({ view: 'courses', progress: myProgressWithFixes });
    const merged = [...page.querySelectorAll('[data-merged-fix]')];
    expect(merged.map((square) => square.getAttribute('data-day'))).toEqual(['2026-11-20']);
    expect(merged[0].getAttribute('aria-label')).toContain('Your fix was merged');
    expect(body({ view: 'courses' }).querySelectorAll('[data-merged-fix]')).toHaveLength(0);
  });

  it('every new line is in plain words, with no long dash', () => {
    for (const view of ['fixes', 'walkthroughs', 'history'] as const) {
      const page = body({
        view,
        fixes: ready({ fixes: myFixes, end: NO_END }),
        walkthroughs: ready({ walkthroughs: myWalkthroughs, fixes: 5 }),
      });
      expect(page.textContent).not.toContain(LONG_DASH);
    }
  });
});
