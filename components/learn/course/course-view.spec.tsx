// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COURSE_VIEW_KEY, CourseView, type CourseViewProps } from './course-view';
import {
  algorithmsCourse,
  algorithmsCoursePaused,
  checkSavedMine,
  checkUnfinishedMine,
  doneMine,
  freshMine,
  goCourse,
  groupDoneMine,
  knownLaterMine,
  lessonAt,
  otherCourses,
  progressMine,
} from '@/lib/learn/__fixtures__/course';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LONG_DASH = String.fromCodePoint(0x2014);
const calls = { onSignIn: () => {}, onRate: async () => true };

function draw(props: Partial<CourseViewProps> = {}) {
  const page = document.createElement('div');
  page.innerHTML = renderToStaticMarkup(
    <CourseView course={algorithmsCourse} mine={null} others={otherCourses} calls={calls} hints {...props} />,
  );
  return page;
}

const textOf = (page: Element, selector: string) => page.querySelector(selector)?.textContent ?? null;
const boxesOf = (page: Element) =>
  [...page.querySelectorAll('[data-course-boxes] > section')].map((box) => box.textContent ?? '');
const litOf = (page: Element) => page.querySelector('[data-course-boxes] [data-lit]')?.textContent ?? null;

describe("a course's page, not signed in", () => {
  const page = draw();

  it('has one title, its kind, its public numbers in words and the count of its lessons', () => {
    expect(page.querySelectorAll('h1')).toHaveLength(1);
    expect(textOf(page, 'h1')).toBe('Algorithms and data structures');
    expect(page.textContent).toContain('Topic course');
    expect(page.textContent).toContain('Works in any language');
    expect(page.textContent).toContain('1,240 learners');
    expect(page.textContent).toContain('94% rate it good');
    expect(textOf(page, '[data-course-line]')).toBe('86 lessons in 9 groups. Each one takes about two minutes.');
  });

  it('starts with the first lesson, the check behind signing in, and signing in highlighted', () => {
    const [first, middle, last] = boxesOf(page);
    expect(first).toContain('Start here');
    expect(middle).toContain('Take the 2-minute check');
    expect(last).toContain('Sign in');
    expect(litOf(page)).toBe(last);
  });

  it('lists every group and lesson by its place, with no filters, legend or view switch', () => {
    expect(page.querySelectorAll('section[aria-labelledby^="group-"]')).toHaveLength(9);
    expect(page.querySelectorAll('ol > li')).toHaveLength(86);
    expect(page.querySelector('[data-square]')).toBeNull();
    expect(page.textContent).not.toContain('To learn');
    expect(page.textContent).not.toContain('Squares');
    expect(page.querySelector('ol > li a')!.getAttribute('href')).toBe(`/learn/lessons/${lessonAt('1-1').slug}`);
  });

  it('ends with its Markdown copy and the other courses', () => {
    const foot = page.querySelector('main > p:last-child')!;
    expect(foot.textContent).toBe(
      'Written and checked by GitRanks · Markdown version · Other courses: Databases and SQL, Design patterns, System design',
    );
    expect(foot.querySelector('a')!.getAttribute('href')).toBe('/learn/courses/algorithms.md');
  });

  it('hides learners under 10 and a rating the API does not give', () => {
    const few = draw({ course: { ...algorithmsCourse, numbers: { learners: 9, goodShare: null } } });
    expect(few.textContent).not.toContain('learners');
    expect(few.textContent).not.toContain('rate it good');
  });
});

describe("a course's page, signed in", () => {
  it('nothing learned: the first lesson next, the check offered, the counts of the filters', () => {
    const page = draw({ mine: freshMine });
    expect(litOf(page)).toContain('Next for you');
    expect(boxesOf(page)[1]).toContain('Take the check');
    expect(textOf(page, '[data-course-line]')).toBe('86 lessons in 9 groups. Each one takes about two minutes.');
    const chips = [...page.querySelectorAll('fieldset button')].map((chip) => chip.textContent);
    // No page shows a zero: "Due now" keeps its name alone.
    expect(chips).toEqual(['All86', 'To learn86', 'Due now', 'List', 'Squares']);
    expect(page.querySelectorAll('[data-square="next"]')).toHaveLength(1);
  });

  it("in progress: the learner's line, the review box, due lessons marked", () => {
    const page = draw({ mine: progressMine });
    expect(textOf(page, '[data-course-line]')).toBe(
      '10 of 86 learned · 4 practised · 1 mastered · Mark lessons you already know',
    );
    expect(boxesOf(page)[1]).toContain('4 lessons to repeat');
    expect(page.querySelectorAll('ol [data-due]')).toHaveLength(4);
    expect(page.textContent).toContain('4 of 8 learned');
  });

  it('a group finished: it says Done, and the next group starts', () => {
    const page = draw({ mine: groupDoneMine });
    expect(boxesOf(page)[0]).toContain('You finished Hash maps and sets');
    expect(page.querySelector('#group-hash-maps-and-sets')!.parentElement!.textContent).toContain('Done');
  });

  it('the course finished: the rating, the review, and the next course', () => {
    const page = draw({ mine: doneMine });
    const [first, , last] = boxesOf(page);
    expect(first).toContain('You finished this course');
    expect(first).toContain('How was this course?');
    expect(last).toContain('Databases and SQL');
  });

  it('a check left in the middle takes the highlight', () => {
    const page = draw({ mine: checkUnfinishedMine });
    expect(litOf(page)).toContain('4 questions left');
  });

  it('after the check: the marked lessons in grey, counted apart and never called learned', () => {
    const page = draw({ mine: checkSavedMine });
    expect(textOf(page, '[data-course-line]')).toBe('37 marked as known');
    expect(page.querySelector('[data-course-line] a')!.getAttribute('href')).toBe('/learn/check/algorithms');
    expect(page.querySelectorAll('ol [data-square="known"]')).toHaveLength(37);
    const later = draw({ mine: knownLaterMine });
    expect(textOf(later, '[data-course-line]')).toBe('2 of 86 learned · 36 marked as known');
  });

  it('a paused lesson keeps its place, says so, and is not a link', () => {
    const page = draw({ course: algorithmsCoursePaused, mine: progressMine });
    const paused = page.querySelector('li[data-paused]')!;
    expect(paused.textContent).toContain('Paused');
    expect(paused.querySelector('a')).toBeNull();
  });

  it('a language course says its one language', () => {
    const page = draw({ course: goCourse, mine: null });
    expect(page.textContent).toContain('Language course');
    expect(page.textContent).toContain('Examples in Go only');
  });
});

describe("a course's search and the Squares view", () => {
  it('in the list: only the groups found, the match marked, and "N of M shown"', () => {
    const page = draw({ mine: freshMine, drawn: { query: 'search' } });
    const groups = [...page.querySelectorAll('section[aria-labelledby^="group-"] h2')].map((h2) => h2.textContent);
    expect(groups).toEqual(['Trees', 'Graphs', 'Sorting and searching']);
    expect(page.textContent).toContain('1 of 12 shown');
    expect(page.textContent).toContain('10 of 10 shown');
    expect(page.querySelector('h2 mark')!.textContent).toBe('search');
    expect(page.querySelector('[aria-label="Clear the search"]')).not.toBeNull();
    const chips = [...page.querySelectorAll('fieldset button')].slice(0, 2).map((chip) => chip.textContent);
    expect(chips).toEqual(['All13', 'To learn13']);
  });

  it('in the Squares view: every square stays, the ones not found fade', () => {
    const page = draw({ mine: progressMine, drawn: { view: 'squares', query: 'search' } });
    const squares = page.querySelectorAll('.max-sm\\:hidden ul [data-square].size-\\[22px\\]');
    expect(squares).toHaveLength(86);
    expect(page.querySelectorAll('.max-sm\\:hidden ul .opacity-\\[\\.18\\]')).toHaveLength(86 - 13);
    // A phone keeps the list.
    expect(page.querySelector('.sm\\:hidden section')).not.toBeNull();
  });

  it("a square's card names its group, level, state and what a click does", () => {
    const next = lessonAt('3-4');
    const page = draw({ mine: progressMine, drawn: { view: 'squares', openCard: next.slug } });
    const card = page.querySelector(`a[href="/learn/lessons/${next.slug}"] [data-square-card]`)!;
    expect(card.textContent).toContain('Next for you');
    expect(card.textContent).toContain('Hash maps and sets · ');
    expect(card.textContent).toContain('Click to start the lesson');
    expect(card.parentElement!.className).toContain('block');
  });

  it('never writes a long dash', () => {
    for (const mine of [null, freshMine, progressMine, doneMine, checkSavedMine]) {
      expect(draw({ mine }).textContent).not.toContain(LONG_DASH);
    }
  });
});

describe("a course's page in the browser", () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.localStorage.clear();
    // jsdom has no matchMedia: a fine pointer, as a mouse.
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
  });

  const press = (key: string, target: EventTarget = document.body) =>
    act(() => {
      target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    });

  it('"/" goes to the search, Esc clears it, Enter presses the highlighted button', () => {
    const onSignIn = vi.fn();
    act(() =>
      root.render(<CourseView course={algorithmsCourse} mine={null} others={otherCourses} calls={{ onSignIn }} />),
    );
    const input = host.querySelector('input')!;
    press('/');
    expect(document.activeElement).toBe(input);
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, 'graph');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(host.querySelectorAll('section[aria-labelledby^="group-"]')).toHaveLength(1);
    press('Escape', input);
    expect(input.value).toBe('');
    input.blur();
    press('Enter');
    expect(onSignIn).toHaveBeenCalledTimes(1);
  });

  it('keeps the view a learner picks for the next course', () => {
    act(() =>
      root.render(<CourseView course={algorithmsCourse} mine={freshMine} others={otherCourses} calls={calls} />),
    );
    const squares = [...host.querySelectorAll('fieldset button')].find((button) => button.textContent === 'Squares')!;
    act(() => (squares as HTMLButtonElement).click());
    expect(window.localStorage.getItem(COURSE_VIEW_KEY)).toBe('squares');
    expect(squares.getAttribute('aria-pressed')).toBe('true');
    expect(host.textContent).toContain('One square is one lesson, in order.');
  });
});
