// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));
const learn = vi.hoisted(() => ({ readLearnIssues: vi.fn(), readPracticeLessons: vi.fn() }));
vi.mock('@/lib/learn/actions', () => learn);
vi.mock('@/lib/workspace/issue-actions', () => ({ startIssue: vi.fn(), skipIssue: vi.fn() }));
vi.mock('@/lib/workspace/start/start-page.actions', () => ({ readStartPageAttempt: vi.fn() }));

const { LearnIssueList } = await import('./issue-list');
const { PracticeSection } = await import('@/app/learn/components/practice-lessons');
const { learnIssues, PRACTICE, practiceLessons } = await import('@/lib/learn/__fixtures__/home');

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
        startHref={(ref) => `/learn/start/${ref.repo}/${ref.issue}` as never}
      />,
    );
    expect(button('Show 10 more')).toBeNull();
    const starts = [...container.querySelectorAll('a[data-start-control="link"]')];
    expect(starts).toHaveLength(10);
    expect(starts[0]?.getAttribute('href')).toBe('/learn/start/acme/widgets/1');
    expect(container.querySelector('[data-variant="default"]')).toBeNull();
    expect(learn.readLearnIssues).not.toHaveBeenCalled();
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

  it('shows 3 first, then reads 13, 23, … and shows the answer in place', async () => {
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
