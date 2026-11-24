// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/workspace/masked-issue.actions', () => ({
  lookAtIssue: vi.fn(),
  signInToSeeIssue: vi.fn(),
  skipMaskedIssue: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));
const learn = vi.hoisted(() => ({ readLearnIssues: vi.fn(), readPracticeLessons: vi.fn() }));
vi.mock('@/lib/learn/actions', () => learn);
vi.mock('@/lib/workspace/issue-actions', () => ({ startIssue: vi.fn(), skipIssue: vi.fn() }));
vi.mock('@/lib/workspace/start/start-page.actions', () => ({ readStartPageAttempt: vi.fn() }));

const { LearnIssueList } = await import('./issue-list');
const { PracticeSection } = await import('@/app/learn/components/practice-lessons');
const { learnIssues, PRACTICE, practiceLessons } = await import('@/lib/learn/__fixtures__/home');
const { looksToday, maskedIssue } = await import('@/lib/workspace/__fixtures__/masked-issue');
const { LEARN_MASKED_LINE, VISITOR_LOOKS_LINE } = await import('@/lib/workspace/masked-issue');
const maskedActions = vi.mocked(await import('@/lib/workspace/masked-issue.actions'));

import type { LearnIssue, PracticeLesson } from '@/lib/learn/learn.types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.clearAllMocks();
});

const render = (node: ReactNode) => act(async () => root.render(node));
const button = (label: string) =>
  [...container.querySelectorAll('button')].find((each) => each.textContent?.trim() === label) ?? null;
const shown = () => [...container.querySelectorAll('article[data-issue]')].map((row) => row.getAttribute('data-issue'));

const issue = (n: number): LearnIssue => ({
  issueId: `I_${n}`,
  url: `https://github.com/acme/widgets/issues/${n}`,
  repo: 'acme/widgets',
  number: n,
  title: `Issue ${n}`,
  language: 'TypeScript',
  size: 'S',
  why: null,
});
const issues = (from: number, count: number) => Array.from({ length: count }, (_, at) => issue(from + at));

describe("Learn's list with masked issues", () => {
  const LIVE = { looks: looksToday(), numbers: null };
  const masked = (n: number, id: string): LearnIssue => ({
    ...issue(n),
    issueId: null as never,
    repo: null as never,
    number: null as never,
    url: null as never,
    masked: { ...maskedIssue(), id, title: `Masked ${n}` },
  });

  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows each masked issue as its masked row, keyed by its mask id, with the line above and the foot under', async () => {
    await render(
      <LearnIssueList
        issues={learnIssues({ items: [masked(1, 'q7k2m9xa'), masked(2, 'r3n8p1vd'), issue(3)], total: 3 })}
        masked={LIVE}
      />,
    );
    const rows = [...container.querySelectorAll('[data-masked-row]')].map((row) => row.getAttribute('data-masked-row'));
    expect(rows).toEqual(['q7k2m9xa', 'r3n8p1vd']);
    expect(shown()).toEqual(['I_3']);
    expect(container.querySelector('[data-learn-masked-line]')?.textContent).toBe(LEARN_MASKED_LINE);
    expect(container.querySelector('[data-looks-line]')?.textContent).toBe(
      'You can see 20 full issues a day. 17 left today.',
    );
  });

  it('says the line above but not the day while the day cannot be read', async () => {
    await render(
      <LearnIssueList
        issues={learnIssues({ items: [masked(1, 'q7k2m9xa')], total: 1 })}
        masked={{ ...LIVE, looks: null }}
      />,
    );
    expect(container.querySelector('[data-masked-row]')).not.toBeNull();
    expect(container.querySelector('[data-learn-masked-line]')?.textContent).toBe(LEARN_MASKED_LINE);
    expect(container.querySelector('[data-looks-line]')).toBeNull();
    expect(container.querySelector('[data-masked-foot]')).not.toBeNull();
  });

  it('has no line and no foot when every issue comes back named (the viewer named its project)', async () => {
    await render(<LearnIssueList issues={learnIssues({ items: issues(1, 3), total: 3 })} masked={LIVE} />);
    expect(shown()).toHaveLength(3);
    expect(container.querySelector('[data-learn-masked-line]')).toBeNull();
    expect(container.querySelector('[data-masked-foot]')).toBeNull();
  });

  const maskIds = () =>
    [...container.querySelectorAll('[data-masked-row]')].map((row) => row.getAttribute('data-masked-row'));
  const skip = async () => {
    await act(async () => button('Skip')?.click());
    await act(async () => button('Too hard for me')?.click());
  };

  it("puts a skip's next issue in the row's place, and a later read never shows it twice", async () => {
    const next = { ...maskedIssue(), id: 't5w0c4hy', title: 'Masked 9' };
    maskedActions.skipMaskedIssue.mockResolvedValueOnce({ ok: true, data: next });
    learn.readLearnIssues.mockResolvedValueOnce({
      ok: true,
      data: learnIssues({ items: [masked(9, 't5w0c4hy'), masked(2, 'r3n8p1vd'), issue(3), issue(4)], total: 30 }),
    });
    await render(
      <LearnIssueList issues={learnIssues({ items: [masked(1, 'q7k2m9xa'), masked(2, 'r3n8p1vd')], total: 30 })} />,
    );
    await skip();
    expect(maskIds()).toEqual(['t5w0c4hy', 'r3n8p1vd']);
    await act(async () => button('Show 10 more')?.click());
    expect(maskIds()).toEqual(['t5w0c4hy', 'r3n8p1vd']);
    expect(shown()).toEqual(['I_3', 'I_4']);
  });

  it('drops the item of a row that leaves, with no empty place in the list, and keeps the foot', async () => {
    maskedActions.lookAtIssue.mockResolvedValueOnce({ ok: true, data: { outcome: 'LEFT_POOL', page: null } });
    await render(
      <LearnIssueList issues={learnIssues({ items: [masked(1, 'q7k2m9xa'), issue(3)], total: 2 })} masked={LIVE} />,
    );
    await act(async () => button('See the full issue')?.click());
    expect(maskIds()).toEqual([]);
    expect([...container.querySelectorAll('li')].filter((item) => !item.textContent?.trim())).toEqual([]);
    expect(container.querySelector('[data-masked-foot]')).not.toBeNull();
    expect(container.querySelector('[data-list-status]')?.textContent).toBe(
      'That issue is no longer open, so it left your list.',
    );
  });

  it("gives a visitor's masked rows the sign-in and no Skip", async () => {
    await render(
      <LearnIssueList issues={learnIssues({ items: [masked(1, 'q7k2m9xa')], total: 1 })} more={false} visitor />,
    );
    expect(container.textContent).toContain(VISITOR_LOOKS_LINE);
    expect(button('Skip')).toBeNull();
  });
});

describe("Learn's issue list", () => {
  it('reads the list again with 10 more and adds only the new rows under the ones shown, which never move', async () => {
    // The list is ordered again on the second read: rows already shown come back in another order.
    learn.readLearnIssues.mockResolvedValueOnce({
      ok: true,
      data: learnIssues({ items: [...issues(11, 5), ...issues(1, 10).reverse(), ...issues(16, 5)], total: 38 }),
    });
    await render(<LearnIssueList issues={learnIssues({ items: issues(1, 10), total: 38 })} />);
    expect(shown()).toHaveLength(10);
    expect(container.textContent).toContain('Showing 10 of 38 issues');
    await act(async () => button('Show 10 more')?.click());
    expect(learn.readLearnIssues).toHaveBeenCalledWith(20);
    expect(shown()).toEqual([...issues(1, 10), ...issues(11, 5), ...issues(16, 5)].map(({ issueId }) => issueId));
    expect(container.textContent).toContain('Showing 20 of 38 issues');
    expect(button('Show 10 more')).not.toBeNull();
  });

  it('stops when a read adds nothing, keeping the count line', async () => {
    learn.readLearnIssues.mockResolvedValueOnce({ ok: true, data: learnIssues({ items: issues(1, 10), total: 38 }) });
    await render(<LearnIssueList issues={learnIssues({ items: issues(1, 10), total: 38 })} />);
    await act(async () => button('Show 10 more')?.click());
    expect(shown()).toHaveLength(10);
    expect(button('Show 10 more')).toBeNull();
    expect(container.textContent).toContain('Showing 10 of 38 issues');
  });

  it('stops at 100 rows', async () => {
    learn.readLearnIssues.mockResolvedValueOnce({ ok: true, data: learnIssues({ items: issues(1, 100), total: 140 }) });
    await render(<LearnIssueList issues={learnIssues({ items: issues(1, 90), total: 140 })} />);
    await act(async () => button('Show 10 more')?.click());
    expect(learn.readLearnIssues).toHaveBeenCalledWith(100);
    expect(shown()).toHaveLength(100);
    expect(button('Show 10 more')).toBeNull();
    expect(container.textContent).toContain('Showing 100 of 140 issues');
  });

  it('says when more could not be read, and keeps the rows', async () => {
    learn.readLearnIssues.mockResolvedValueOnce({ ok: false, error: 'FAILED' });
    await render(<LearnIssueList issues={learnIssues({ items: issues(1, 10), total: 38 })} />);
    await act(async () => button('Show 10 more')?.click());
    expect(shown()).toHaveLength(10);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Couldn’t load more');
  });

  it('can be placed for a visitor: no Show 10 more, its Start a lesson where the page says, no primary', async () => {
    await render(
      <LearnIssueList
        issues={learnIssues({ items: issues(1, 10), total: 38 })}
        more={false}
        primary={false}
        start={{ base: '/learn/start', query: 'goal=TypeScript' }}
      />,
    );
    expect(button('Show 10 more')).toBeNull();
    const starts = [...container.querySelectorAll('a[data-start-control="link"]')];
    expect(starts).toHaveLength(10);
    expect(starts[0]?.getAttribute('href')).toBe('/learn/start/acme/widgets/1?goal=TypeScript');
    expect(container.querySelector('[data-variant="default"]')).toBeNull();
    expect(learn.readLearnIssues).not.toHaveBeenCalled();
  });

  it('keeps the rows shown in place when the page reads itself again in another order', async () => {
    learn.readLearnIssues.mockResolvedValueOnce({ ok: true, data: learnIssues({ items: issues(1, 20), total: 38 }) });
    const list = (items: LearnIssue[]) => <LearnIssueList issues={learnIssues({ items, total: 38 })} />;
    await render(list(issues(1, 10)));
    await act(async () => button('Show 10 more')?.click());
    const before = shown();
    expect(before).toHaveLength(20);
    // The new read: reordered, a grown row now in the top 10, a first-read row left out, one row never shown.
    const reread = [issue(15), ...issues(2, 8).reverse(), issue(31)];
    await render(list(reread));
    expect(shown()).toEqual([...before, 'I_31']);
    // Each row is drawn from the newest data read for it.
    await render(list([{ ...issue(3), title: 'Renamed upstream' }, ...issues(4, 9)]));
    expect(container.querySelector('article[data-issue="I_3"]')?.textContent).toContain('Renamed upstream');
    expect(shown().slice(0, 3)).toEqual(['I_1', 'I_2', 'I_3']);
  });

  it('counts a click as from the list on its rows only, never on its notes’ links', async () => {
    await render(
      <LearnIssueList
        issues={learnIssues({ items: issues(1, 2), room: { limit: 'open_prs_at_a_time', value: 2 } })}
        source="learn_home_issue"
      />,
    );
    const marked = [...container.querySelectorAll('[data-contribute-source]')];
    expect(marked.map((each) => each.tagName)).toEqual(['UL']);
    expect(container.querySelector('[data-room] [data-contribute-source]')).toBeNull();
    expect(container.querySelector('[data-room]')?.closest('[data-contribute-source]')).toBeNull();
    await render(
      <LearnIssueList issues={learnIssues({ items: [], total: 0, empty: 'NONE_TODAY' })} source="learn_home_issue" />,
    );
    expect(container.querySelector('[data-contribute-source]')).toBeNull();
  });

  it('draws the held notice itself, with no rows', async () => {
    await render(<LearnIssueList issues={learnIssues()} held />);
    expect(container.textContent).toContain('Learn is paused for this account, so no issues are shown.');
    expect(shown()).toHaveLength(0);
  });
});

describe("The Learn tab's practice lessons", () => {
  const lessons = (count: number): PracticeLesson[] =>
    Array.from({ length: count }, (_, at) => ({ ...PRACTICE[0], slug: `lesson-${at}`, title: `Lesson ${at}` }));

  it('shows 3 first, then reads 13, 23, … and adds the new cards under the others', async () => {
    learn.readPracticeLessons.mockResolvedValueOnce({
      ok: true,
      data: practiceLessons({ items: lessons(13), total: 15 }),
    });
    learn.readPracticeLessons.mockResolvedValueOnce({
      ok: true,
      data: practiceLessons({ items: lessons(15), total: 15 }),
    });
    await render(
      <PracticeSection
        practice={practiceLessons({ items: lessons(3), total: 15 })}
        goal="TypeScript"
        title="t"
        text="x"
      />,
    );
    expect(container.querySelectorAll('[data-practice-lesson]')).toHaveLength(3);
    expect(container.textContent).toContain('Showing 3 of 15 practice lessons');
    await act(async () => button('Show 10 more')?.click());
    expect(learn.readPracticeLessons).toHaveBeenLastCalledWith(13);
    expect(container.querySelectorAll('[data-practice-lesson]')).toHaveLength(13);
    await act(async () => button('Show 2 more')?.click());
    expect(learn.readPracticeLessons).toHaveBeenLastCalledWith(23);
    expect(container.querySelectorAll('[data-practice-lesson]')).toHaveLength(15);
    expect(button('Show 2 more')).toBeNull();
  });

  it('keeps the cards shown in place when the newest-first list moved meanwhile', async () => {
    // A lesson published meanwhile comes first in the answer: the cards shown stay where they are.
    const fresh = { ...PRACTICE[0], slug: 'new-one', title: 'New one' };
    learn.readPracticeLessons.mockResolvedValueOnce({
      ok: true,
      data: practiceLessons({ items: [fresh, ...lessons(12)], total: 16 }),
    });
    await render(
      <PracticeSection
        practice={practiceLessons({ items: lessons(3), total: 15 })}
        goal="TypeScript"
        title="t"
        text="x"
      />,
    );
    await act(async () => button('Show 10 more')?.click());
    const slugs = [...container.querySelectorAll('[data-practice-lesson]')].map((card) =>
      card.getAttribute('data-practice-lesson'),
    );
    expect(slugs.slice(0, 3)).toEqual(['lesson-0', 'lesson-1', 'lesson-2']);
    expect(slugs).toHaveLength(13);
    expect(slugs.at(-1)).toBe('lesson-11');
    expect(slugs).toContain('new-one');
  });

  it('ends without an error when a read adds nothing (the list got shorter)', async () => {
    learn.readPracticeLessons.mockResolvedValueOnce({
      ok: true,
      data: practiceLessons({ items: lessons(3), total: 3 }),
    });
    await render(
      <PracticeSection
        practice={practiceLessons({ items: lessons(3), total: 15 })}
        goal="TypeScript"
        title="t"
        text="x"
      />,
    );
    await act(async () => button('Show 10 more')?.click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(button('Show 10 more')).toBeNull();
    expect(container.querySelectorAll('[data-practice-lesson]')).toHaveLength(3);
  });

  it('asks for at most 93', async () => {
    await render(
      <PracticeSection
        practice={practiceLessons({ items: lessons(3), total: 200 })}
        goal="TypeScript"
        title="t"
        text="x"
      />,
    );
    expect(container.textContent).toContain('Showing 3 of 93 practice lessons');
  });
});
