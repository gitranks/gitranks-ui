// @vitest-environment jsdom
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { type MyProgressHistory, ProgressBody } from './my-progress-live';
import {
  CoursesList,
  HistoryFailed,
  HistoryList,
  HistoryPending,
  ProgressEmpty,
  ProgressFailed,
  ProgressPending,
  ProgressVisitor,
} from './my-progress-parts';
import {
  historyFirst,
  myProgress,
  myProgressFirstDay,
  myProgressKnownOnly,
  PROGRESS_TODAY,
  progressCourses,
} from '@/lib/learn/__fixtures__/my-progress';
import type { LearnMyProgress, MyProgressView } from '@/lib/learn/my-progress';

const LONG_DASH = String.fromCodePoint(0x2014);

function draw(element: ReactElement) {
  const page = document.createElement('div');
  page.innerHTML = renderToStaticMarkup(element);
  return page;
}

const body = (progress: LearnMyProgress, view: MyProgressView = 'courses', history: MyProgressHistory | null = null) =>
  draw(
    <ProgressBody
      progress={progress}
      today={PROGRESS_TODAY}
      view={view}
      history={history}
      onMore={() => {}}
      onHistoryReload={() => {}}
    />,
  );

const textOf = (page: Element, selector: string) => page.querySelector(selector)?.textContent ?? null;
/** No count of zero anywhere a person reads, and no long dash. */
function expectNoZeroOrDash(page: Element) {
  expect(page.textContent).not.toMatch(/(^|[^\d.,])0(?![\d.,%])/);
  expect(page.textContent).not.toContain(LONG_DASH);
  for (const label of page.querySelectorAll('[aria-label]')) {
    expect(label.getAttribute('aria-label')).not.toMatch(/(^|[^\d.,])0(?![\d.,%])/);
  }
}

describe('My progress: the two boxes', () => {
  it('counts the lessons learned, a row a depth, and marked as known apart', () => {
    const page = body(myProgress);
    expect(textOf(page, '[data-lessons-headline]')).toBe('105lessons learned');
    const lessons = page.querySelector('section[aria-labelledby="my-progress-lessons"]')!;
    expect([...lessons.querySelectorAll('li')].map((row) => row.textContent)).toEqual([
      expect.stringContaining('Learned'),
      expect.stringContaining('Practised'),
      expect.stringContaining('Mastered'),
      expect.stringContaining('Marked as known'),
    ]);
    // Wave 1 has no Skills page: no link to it.
    expect(lessons.querySelector('a')).toBeNull();
    expectNoZeroOrDash(page);
  });

  it('draws 26 weeks of days, each day with something done a link to it in History with what was done', () => {
    const page = body(myProgress);
    const calendar = page.querySelector('[data-calendar]')!;
    expect(calendar.getAttribute('role')).toBe('group');
    expect(calendar.children).toHaveLength(182);
    const links = calendar.querySelectorAll('a');
    expect(links).toHaveLength(myProgress.days.length);
    const friday = calendar.querySelector('a[data-day="2026-11-20"]')!;
    expect(friday.getAttribute('href')).toBe('/learn/progress?view=history&day=2026-11-20');
    expect(friday.getAttribute('aria-label')).toBe('Friday 20 Nov: 2 lessons learned');
    // A day with nothing done is no tab stop, and not read out.
    const empty = calendar.querySelector('[data-day="2026-11-19"]')!;
    expect(empty.tagName).toBe('SPAN');
    expect(empty.getAttribute('aria-hidden')).toBe('true');
    // The oldest nine weeks are left out on a phone.
    expect(calendar.querySelector('[data-day="2026-05-25"]')!.className).toContain('max-sm:hidden');
    expect(calendar.querySelector('[data-day="2026-07-27"]')!.className).not.toContain('max-sm:hidden');
    expect(textOf(page, '[data-days-line]')).toBe('You were active on 80 days since 8 Jun.');
  });

  it('gives a day active with no lesson and no review words, never a bare date', () => {
    const quiet = { day: '2026-11-19', lessons: 0, reviews: 0, learned: [], repeated: [] };
    const page = body({ ...myProgress, days: [...myProgress.days, quiet] });
    const day = page.querySelector('[data-calendar] a[data-day="2026-11-19"]')!;
    expect(day.getAttribute('aria-label')).toBe('Thursday 19 Nov: active');
    expect(day.textContent).toContain('Thursday 19 NovActive');
    expect(day.textContent).not.toMatch(/: ?$|\b0\b/);
  });

  it('the first day: one row, one day, "Your first day."', () => {
    const page = body(myProgressFirstDay);
    expect(textOf(page, '[data-lessons-headline]')).toBe('1lesson learned');
    expect(page.querySelectorAll('section[aria-labelledby="my-progress-lessons"] li')).toHaveLength(1);
    expect(page.querySelectorAll('[data-calendar] a')).toHaveLength(1);
    expect(textOf(page, '[data-days-line]')).toBe('Your first day.');
    expect(textOf(page, '[data-view-line]')).toBe('1 course started');
    expectNoZeroOrDash(page);
  });

  it('lessons marked as known only: counted as known, never as learned, and no day', () => {
    const page = body(myProgressKnownOnly);
    expect(textOf(page, '[data-lessons-headline]')).toBe('37lessons marked as known');
    expect(page.textContent).toContain('Answer a lesson and it counts as Learned.');
    expect(page.querySelectorAll('[data-calendar] a')).toHaveLength(0);
    expect(textOf(page, '[data-days-line]')).toBe('The days you are active show here.');
    const card = page.querySelector('[data-my-course="algorithms"]')!;
    expect(card.querySelector('[data-course-standing]')).toBeNull();
    expect(card.textContent).toContain('37 marked as known');
    expectNoZeroOrDash(page);
  });
});

describe('My progress: the switch and Courses', () => {
  it('marks the view shown, with links to both views', () => {
    for (const view of ['courses', 'history'] as const) {
      const page = body(myProgress, view);
      const nav = page.querySelector('nav[aria-label="What to list"]')!;
      expect([...nav.querySelectorAll('a')].map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
        ['Courses', '/learn/progress'],
        ['History', '/learn/progress?view=history'],
      ]);
      expect(nav.querySelector('[aria-current="page"]')!.getAttribute('data-view')).toBe(view);
    }
  });

  it('a card a course started: how far, what is due, the next lesson or the day it was finished', () => {
    const page = body(myProgress);
    expect(textOf(page, '[data-view-line]')).toBe('3 courses started, 1 of them finished');
    const algorithms = page.querySelector('[data-my-course="algorithms"]')!;
    expect(algorithms.querySelector('[data-course-due]')!.getAttribute('href')).toBe('/learn/review?course=algorithms');
    expect(algorithms.querySelector('[data-course-due]')!.textContent).toBe('4 due now in the review');
    expect(algorithms.textContent).toContain('Count things with a hash map');
    expect(algorithms.querySelector('[role="img"]')!.getAttribute('aria-label')).toBeTruthy();
    const databases = page.querySelector('[data-my-course="databases"]')!;
    expect(textOf(databases, '[data-course-finished]')).toBe('Finished on 12 Nov');
    expect(databases.querySelector('[data-course-due]')).toBeNull();
    expect(databases.textContent).not.toContain('Next lesson');
    // Each "Open course" says which course to a screen reader.
    expect(
      [...page.querySelectorAll('[data-my-course] a')].filter((a) => a.textContent?.startsWith('Open course')),
    ).toHaveLength(3);
    expect(databases.textContent).toContain('Open course: ');
    expectNoZeroOrDash(page);
  });

  it('has no list with no course started', () => {
    expect(draw(<CoursesList courses={[]} today={PROGRESS_TODAY} />).innerHTML).toBe('');
    expect(
      draw(<CoursesList courses={progressCourses} today={PROGRESS_TODAY} />).querySelectorAll('li[data-my-course]'),
    ).toHaveLength(3);
  });
});

describe('My progress: History', () => {
  const ready = (patch: Partial<Extract<MyProgressHistory, { kind: 'ready' }>> = {}): MyProgressHistory => ({
    kind: 'ready',
    from: null,
    days: historyFirst.days,
    more: 'more',
    focus: null,
    ...patch,
  });

  it('one group a day, newest first, the review first, with the lessons a page still shows', () => {
    const page = body(myProgress, 'history', ready());
    expect(textOf(page, '[data-view-line]')).toBe('Since 8 Jun');
    const days = [...page.querySelectorAll('[data-history-day]')];
    expect(days.map((day) => day.id)).toEqual([
      'day-2026-11-22',
      'day-2026-11-21',
      'day-2026-11-20',
      'day-2026-11-17',
      'day-2026-11-12',
    ]);
    expect(days[0].querySelector('h3')!.textContent).toBe('Today, Sunday 22 Nov');
    expect([...days[0].querySelectorAll('[data-entry]')].map((line) => line.getAttribute('data-entry'))).toEqual([
      'review',
      'lessons',
    ]);
    expect(days[0].textContent).toContain('Repeated 6 lessons');
    expect(days[0].querySelectorAll('a')).toHaveLength(5);
    // A lesson learned that no page shows any more: counted, not linked.
    expect(days[1].querySelector('[data-entry="lessons"]')!.textContent).toBe('LessonsLearned 1 lesson');
    expect(page.querySelector('[data-history-more]')!.textContent).toBe('Show earlier days');
    expect(page.textContent).not.toContain('Show the newest days');
    expectNoZeroOrDash(page);
  });

  it('opened at a day: a link back to the newest days', () => {
    const page = body(myProgress, 'history', ready({ from: '2026-11-20' }));
    const back = [...page.querySelectorAll('a')].find((link) => link.textContent === 'Show the newest days')!;
    expect(back.getAttribute('href')).toBe('/learn/progress?view=history');
  });

  it('the way to earlier days while they load, when they did not, and none at the end', () => {
    const list = (more: 'more' | 'loading' | 'failed' | 'end') =>
      draw(<HistoryList days={historyFirst.days} today={PROGRESS_TODAY} more={more} onMore={() => {}} />);
    const loading = list('loading').querySelector('[data-history-more]')!;
    expect(loading.textContent).toBe('Loading earlier days…');
    expect(loading.hasAttribute('disabled')).toBe(true);
    expect(loading.getAttribute('aria-busy')).toBe('true');
    const failed = list('failed');
    expect(failed.textContent).toContain('The earlier days did not load.');
    expect(failed.querySelector('[data-history-more]')!.textContent).toBe('Try again');
    expect(list('end').querySelector('[data-history-more]')).toBeNull();
  });

  it('while the first page loads, and when it did not', () => {
    expect(draw(<HistoryPending />).querySelector('[role="status"]')!.textContent).toBe('Loading your days…');
    const failed = draw(<HistoryFailed onReload={() => {}} />);
    expect(failed.textContent).toContain('Your days did not load.');
    expect(failed.querySelector('button')!.textContent).toBe('Try again');
    expect(body(myProgress, 'history', null).querySelector('[data-history="pending"]')).not.toBeNull();
    expect(
      body(myProgress, 'history', { kind: 'failed', from: null }).querySelector('[data-history="failed"]'),
    ).not.toBeNull();
  });
});

describe('My progress: the pages with nothing to list', () => {
  it('a visitor, and a session that ended: the way in is to sign in', () => {
    const visitor = draw(<ProgressVisitor onSignIn={() => {}} />);
    expect(visitor.querySelector('h1')!.textContent).toBe('Your progress needs an account');
    expect(visitor.querySelector('button')!.textContent).toBe('Sign in with GitHub');
    const ended = draw(<ProgressVisitor ended onSignIn={() => {}} />);
    expect(ended.querySelector('h1')!.textContent).toBe('Sign in again to see your progress');
  });

  it('nothing yet: one way on, to the courses', () => {
    const page = draw(<ProgressEmpty />);
    expect(page.querySelector('h1')!.textContent).toBe('Your progress starts with your first lesson');
    expect(page.querySelector('a')!.getAttribute('href')).toBe('/learn/courses');
    expect(page.textContent).not.toContain('fixes');
  });

  it('a read that failed, and the wait', () => {
    const failed = draw(<ProgressFailed onReload={() => {}} />);
    expect(failed.querySelector('h1')!.textContent).toBe('Your progress did not load');
    expect(failed.querySelector('button')!.textContent).toBe('Try again');
    const pending = draw(<ProgressPending />);
    expect(pending.querySelector('[role="status"]')!.textContent).toBe('Loading your progress…');
    expect(pending.querySelectorAll('section')).toHaveLength(2);
  });

  it('every message is in plain words, with no long dash', () => {
    for (const page of [
      draw(<ProgressVisitor onSignIn={() => {}} />),
      draw(<ProgressEmpty />),
      draw(<ProgressFailed onReload={() => {}} />),
    ]) {
      expect(page.textContent).not.toContain(LONG_DASH);
    }
  });
});

describe('My progress: headings, labels and phone targets', () => {
  it('each view has its own heading, so the cards and days are not read as part of "Days"', () => {
    for (const [view, heading] of [
      ['courses', 'Courses'],
      ['history', 'History'],
    ] as const) {
      const page = body(myProgress, view, null);
      const h2s = [...page.querySelectorAll('h2')].map((h2) => h2.textContent);
      expect(h2s).toEqual(['Lessons', 'Days', heading]);
    }
  });

  it('the days are labelled without a count of weeks: a phone shows fewer of them', () => {
    const label = body(myProgress).querySelector('[data-calendar]')!.getAttribute('aria-label');
    expect(label).toBe('The days you were active');
  });

  it('the switch, the course buttons and History’s buttons are 44 pixels tall on a phone', () => {
    const page = body(myProgress);
    for (const link of page.querySelectorAll('nav a')) expect(link.className).toContain('max-sm:min-h-11');
    const open = [...page.querySelectorAll('[data-my-course] a')].filter((a) =>
      a.textContent?.startsWith('Open course'),
    );
    for (const link of open) expect(link.className).toContain('max-sm:min-h-11');
    const list = draw(<HistoryList days={historyFirst.days} today={PROGRESS_TODAY} more="more" onMore={() => {}} />);
    expect(list.querySelector('[data-history-more]')!.className).toContain('max-sm:min-h-11');
    expect(draw(<HistoryFailed onReload={() => {}} />).querySelector('button')!.className).toContain('max-sm:min-h-11');
  });

  it('History with no day at all says where the days will show', () => {
    const page = draw(<HistoryList days={[]} today={PROGRESS_TODAY} more="end" onMore={() => {}} />);
    expect(page.querySelector('[data-history-none]')!.textContent).toBe('The days you are active show here.');
    const some = draw(<HistoryList days={historyFirst.days} today={PROGRESS_TODAY} more="end" onMore={() => {}} />);
    expect(some.querySelector('[data-history-none]')).toBeNull();
  });
});
