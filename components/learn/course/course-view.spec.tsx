// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COURSE_VIEW_KEY, CourseView, type CourseViewProps } from './course-view';
import {
  algorithmsCourse,
  algorithmsCoursePaused,
  allKnownMine,
  checkSavedMine,
  checkUnfinishedMine,
  doneMine,
  donePausedMine,
  donePausedUnstampedMine,
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

  it('a paused lesson learned before keeps its colour, and the group counts it', () => {
    const page = draw({ course: algorithmsCoursePaused, mine: progressMine });
    const paused = page.querySelector('li[data-paused]')!;
    expect(paused.querySelector('[data-square="learned"][data-paused]')).not.toBeNull();
    expect(paused.textContent).toContain('Learned.');
    expect(page.querySelector('#group-hash-maps-and-sets')!.parentElement!.textContent).toContain('3 of 9 learned');
  });

  it('not started, for an experienced developer: the check takes the highlight and Enter', () => {
    const page = draw({ mine: freshMine, checkFirst: true });
    expect(litOf(page)).toContain('Take the 2-minute check');
    expect(page.querySelector('[data-lit] [data-course-enter]')!.textContent).toContain('Take the check');
  });

  it('the course finished: the rating the learner gave shows pressed', () => {
    const page = draw({ mine: doneMine });
    expect(page.querySelector('[aria-pressed="true"]')!.textContent).toBe('Good');
  });

  it('the course finished: Enter goes to the review while lessons are due; with none due, no box is lit', () => {
    const page = draw({ mine: doneMine });
    expect(litOf(page)).toContain('5 lessons to repeat');
    expect(page.querySelector('[data-lit] [data-course-enter]')!.getAttribute('href')).toBe('/learn/review');
    const nothingDue = draw({ mine: { ...doneMine, due: 0 } });
    expect(nothingDue.querySelector('[data-lit]')).toBeNull();
    expect(nothingDue.querySelector('[data-course-enter]')).toBeNull();
  });

  it('finished, never stamped (the last lesson paused before it was reached): no offer to mark lessons', () => {
    const page = draw({ course: algorithmsCoursePaused, mine: donePausedUnstampedMine });
    expect(boxesOf(page)[0]).toContain('You finished this course');
    expect(textOf(page, '[data-course-line]')).toMatch(/^85 of 86 learned/);
    expect(page.textContent).not.toContain('Mark lessons you already know');
  });

  it('a paused lesson marked as known keeps its grey square, as its group counts it', () => {
    const page = draw({ course: algorithmsCoursePaused, mine: checkSavedMine });
    const paused = page.querySelector('li[data-paused]')!;
    expect(paused.querySelector('[data-square="known"][data-paused]')).not.toBeNull();
    expect(page.querySelector('#group-hash-maps-and-sets')!.parentElement!.textContent).toContain('7 marked as known');
    const group = page.querySelector('section[aria-labelledby="group-hash-maps-and-sets"]')!;
    expect(group.querySelectorAll('ol [data-square="known"]')).toHaveLength(7);
  });

  it('a paused lesson never answered says Paused once to a screen reader', () => {
    const page = draw({ course: algorithmsCoursePaused, mine: freshMine });
    const paused = page.querySelector('li[data-paused]')!;
    expect(paused.querySelector('.sr-only')).toBeNull();
    expect(paused.textContent!.match(/Paused/g)).toHaveLength(1);
  });

  it('finished with a paused lesson never answered: the box and the line under the title agree', () => {
    const page = draw({ course: algorithmsCoursePaused, mine: donePausedMine });
    expect(boxesOf(page)[0]).toContain('85 of 86 lessons learned');
    expect(boxesOf(page)[0]).toContain('The one lesson left is paused while we correct it.');
    expect(textOf(page, '[data-course-line]')).toMatch(/^85 of 86 learned/);
  });

  it('every lesson left marked as known: the first of them, to learn it by answering', () => {
    const page = draw({ mine: allKnownMine });
    expect(litOf(page)).toContain('Nothing new left');
    expect(litOf(page)).toContain(lessonAt('1-2').title);
    expect(page.querySelector('[data-lit] a')!.getAttribute('href')).toBe(`/learn/lessons/${lessonAt('1-2').slug}`);
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

  it('in the Squares view: every square stays, the ones not found fade and leave the keys and the screen reader', () => {
    const page = draw({ mine: progressMine, drawn: { view: 'squares', query: 'search' } });
    const squares = page.querySelectorAll('.max-sm\\:hidden ul [data-square].size-\\[22px\\]');
    expect(squares).toHaveLength(86);
    const faded = page.querySelectorAll('.max-sm\\:hidden ul [data-faded]');
    expect(faded).toHaveLength(86 - 13);
    for (const square of faded) {
      expect(square.getAttribute('tabindex')).toBe('-1');
      expect(square.getAttribute('aria-hidden')).toBe('true');
    }
    expect(page.querySelector('[data-course-status]')!.textContent).toBe('13 lessons shown.');
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

  it('a filter with nothing in it: the same words and the way back, in the list and in the Squares view', () => {
    for (const view of ['list', 'squares'] as const) {
      const page = draw({ mine: freshMine, drawn: { view, filter: 'due' } });
      const nothing = page.querySelector('[data-course-nothing]')!;
      // Outside the phone-only part: it shows on every width.
      expect(nothing.closest('.sm\\:hidden')).toBeNull();
      expect(nothing.textContent).toBe('No lesson here for this filter. Show all lessons');
      expect(page.querySelector('[data-course-status]')!.textContent).toBe('No lesson found.');
    }
  });

  it('"To learn" keeps lessons not learned and not marked as known', () => {
    const page = draw({ mine: knownLaterMine, drawn: { filter: 'to-learn' } });
    expect(page.querySelectorAll('ol [data-square="known"]')).toHaveLength(0);
    expect(page.querySelectorAll('ol [data-square="learned"]')).toHaveLength(0);
    expect(page.querySelectorAll('ol [data-square="next"]')).toHaveLength(1);
  });

  it('a paused square in the Squares view is a button with its card, not a link', () => {
    const paused = lessonAt('3-3');
    const page = draw({
      course: algorithmsCoursePaused,
      mine: freshMine,
      drawn: { view: 'squares', openCard: paused.slug },
    });
    const square = page.querySelector(`button[aria-label^="${paused.title}"]`)!;
    expect(square.getAttribute('aria-label')).toBe(`${paused.title} · Paused`);
    expect(square.querySelector('[data-square-card]')!.textContent).toContain('Paused: we are correcting a mistake');
    expect(page.querySelector(`a[href="/learn/lessons/${paused.slug}"]`)).toBeNull();
  });

  it('a learner hears the row: its state, then its title and pills', () => {
    const page = draw({ mine: progressMine });
    const next = page.querySelector(`ol a[href="/learn/lessons/${lessonAt('3-4').slug}"]`)!;
    expect(next.getAttribute('aria-label')).toBeNull();
    expect(next.textContent).toBe(`Not started. ${lessonAt('3-4').title}Next`);
  });

  it('never writes a long dash', () => {
    for (const mine of [null, freshMine, progressMine, doneMine, checkSavedMine, allKnownMine]) {
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

  it('R opens the review; a key typed in the language menu never does', () => {
    act(() =>
      root.render(<CourseView course={algorithmsCourse} mine={progressMine} others={otherCourses} calls={calls} />),
    );
    const review = host.querySelector<HTMLElement>('[data-course-key="R"]')!;
    let opened = 0;
    review.addEventListener('click', (event) => {
      event.preventDefault();
      opened += 1;
    });
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    const item = document.createElement('div');
    item.setAttribute('role', 'menuitemradio');
    menu.append(item);
    document.body.append(menu);
    press('r', item);
    press('/', item);
    expect(opened).toBe(0);
    expect(document.activeElement).not.toBe(host.querySelector('input'));
    press('r');
    expect(opened).toBe(1);
    menu.remove();
  });

  it('a filter chip filters the list; Esc hides a square card before it clears the search', () => {
    act(() =>
      root.render(
        <CourseView
          course={algorithmsCourse}
          mine={progressMine}
          others={otherCourses}
          calls={calls}
          drawn={{ view: 'squares', query: 'search' }}
        />,
      ),
    );
    const square = host.querySelector<HTMLElement>('.max-sm\\:hidden ul a:not([data-faded])')!;
    act(() => square.focus());
    const card = () => square.querySelector('[data-square-card]')!.parentElement!.className;
    expect(card()).toContain('block');
    press('Escape', square);
    expect(card()).toContain('hidden');
    expect(host.querySelector('input')!.value).toBe('search');
    press('Escape', square);
    expect(host.querySelector('input')!.value).toBe('');

    const chip = (name: string) =>
      [...host.querySelectorAll<HTMLButtonElement>('fieldset button')].find((button) =>
        button.textContent?.startsWith(name),
      )!;
    act(() => chip('List').click());
    act(() => chip('Due now').click());
    expect(host.querySelectorAll('ol > li')).toHaveLength(4);
    act(() => chip('To learn').click());
    expect(host.querySelectorAll('ol > li')).toHaveLength(76);
  });

  it('Esc meant for a menu or the search field leaves a pointed square card alone', () => {
    act(() =>
      root.render(
        <CourseView
          course={algorithmsCourse}
          mine={progressMine}
          others={otherCourses}
          calls={calls}
          drawn={{ view: 'squares', query: 'search' }}
        />,
      ),
    );
    const square = host.querySelector<HTMLElement>('.max-sm\\:hidden ul a:not([data-faded])')!;
    const card = () => square.querySelector('[data-square-card]')!.parentElement!.className;
    act(() => {
      square.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    });
    expect(card()).toContain('block');
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    document.body.append(menu);
    const menuEsc = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => {
      menu.dispatchEvent(menuEsc);
    });
    // The menu's own Esc is not taken: nothing prevented it, and the card stays.
    expect(menuEsc.defaultPrevented).toBe(false);
    expect(card()).toContain('block');
    menu.remove();
    // Esc in the search field clears the search, and only that.
    const input = host.querySelector('input')!;
    press('Escape', input);
    expect(input.value).toBe('');
    expect(card()).toContain('block');
  });

  it('"Show all lessons" and "Clear the search" leave the focus in the search field', () => {
    act(() =>
      root.render(
        <CourseView
          course={algorithmsCourse}
          mine={freshMine}
          others={otherCourses}
          calls={calls}
          drawn={{ view: 'squares', filter: 'due' }}
        />,
      ),
    );
    const showAll = [...host.querySelectorAll<HTMLButtonElement>('[data-course-nothing] button')][0]!;
    act(() => showAll.focus());
    act(() => showAll.click());
    expect(host.querySelector('[data-course-nothing]')).toBeNull();
    const input = host.querySelector('input')!;
    expect(document.activeElement).toBe(input);
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, 'graph');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const clearButton = host.querySelector<HTMLButtonElement>('button[aria-label="Clear the search"]')!;
    act(() => clearButton.focus());
    act(() => clearButton.click());
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
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
