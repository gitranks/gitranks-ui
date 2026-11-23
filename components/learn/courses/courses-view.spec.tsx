// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { CoursesView, type CoursesViewProps } from './courses-view';
import {
  courseCards,
  coursesMine,
  coursesMineAllLearned,
  coursesMineChecked,
  lessonDepths,
  lessonList,
} from '@/lib/learn/__fixtures__/course';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LONG_DASH = String.fromCodePoint(0x2014);

function draw(props: Partial<CoursesViewProps> = {}) {
  const page = document.createElement('div');
  page.innerHTML = renderToStaticMarkup(
    <CoursesView courses={courseCards} lessons={lessonList} mine={null} depths={null} hints {...props} />,
  );
  return page;
}

const cardOf = (page: Element, slug: string) => page.querySelector(`[data-course-card="${slug}"]`)!;
const statsOf = (page: Element, slug: string) => cardOf(page, slug).querySelector('[data-course-stats]')!.textContent;

describe('all courses, not signed in', () => {
  const page = draw();

  it('has a title for screen readers and a section a kind, each course a link to its page', () => {
    expect(page.querySelector('h1.sr-only')!.textContent).toBe('All courses on GitRanks Learn');
    const sections = [...page.querySelectorAll('section h2')].map((h2) => h2.textContent);
    expect(sections).toEqual(['Topics, in any language', 'Languages']);
    expect(page.querySelectorAll('[data-course-card]')).toHaveLength(11);
    expect(page.querySelector('[data-courses-found]')).toBeNull();
    expect(cardOf(page, 'algorithms').getAttribute('href')).toBe('/learn/courses/algorithms');
  });

  it('says the numbers worth showing, in words for a screen reader and when pointed at', () => {
    const algorithms = cardOf(page, 'algorithms');
    expect(statsOf(page, 'algorithms')).toBe('86 lessons1,240 learners1,240 learners94% rate it good94% rate it good');
    expect([...algorithms.querySelectorAll('.sr-only')].map((words) => words.textContent)).toEqual([
      ' learners',
      ' rate it good',
    ]);
    // System design has no number worth showing: its lessons alone.
    expect(statsOf(page, 'system-design')).toBe('47 lessons');
  });

  it('hides learners under 10', () => {
    const few = draw({
      courses: courseCards.map((course) =>
        course.slug === 'rust' ? { ...course, numbers: { learners: 9, goodShare: null } } : course,
      ),
    });
    expect(statsOf(few, 'rust')).toBe('105 lessons');
  });

  it('shows no legend and no bar, and ends with the Markdown copy and the file for agents', () => {
    expect(page.querySelector('[role="img"]')).toBeNull();
    expect(page.querySelector('[aria-label="What the colours of your progress mean"]')).toBeNull();
    const links = [...page.querySelectorAll('main > p:last-child a')].map((link) => link.getAttribute('href'));
    expect(links).toEqual(['/learn/courses.md', '/llms.txt']);
  });
});

describe('all courses, a learner', () => {
  it("puts the learner's figure in place of the lessons, and a bar on the bottom edge", () => {
    const page = draw({ mine: coursesMine });
    expect(statsOf(page, 'algorithms')).toMatch(/^10 of 86 learned/);
    expect(statsOf(page, 'go')).toMatch(/^3 of 104 learned/);
    expect(cardOf(page, 'algorithms').querySelector('[role="img"]')!.getAttribute('aria-label')).toBe(
      '10 of 86 lessons learned: 4 practised, 1 mastered',
    );
    expect(cardOf(page, 'databases').querySelector('[role="img"]')).toBeNull();
    expect(page.querySelector('[aria-label="What the colours of your progress mean"]')!.textContent).toBe(
      'LearnedPractisedMastered',
    );
  });

  it('every lesson learned: "All 86 learned"; after the check: the known ones apart', () => {
    const page = draw({ mine: [coursesMineAllLearned, coursesMineChecked] });
    expect(statsOf(page, 'algorithms')).toMatch(/^All 86 learned/);
    expect(statsOf(page, 'go')).toMatch(/^12 of 104 learned · 40 marked as known/);
    const bar = cardOf(page, 'go').querySelector('[role="img"]')!;
    expect(bar.getAttribute('aria-label')).toBe('12 of 104 lessons learned: 4 practised, 40 marked as known');
    expect(bar.children).toHaveLength(3);
  });
});

describe('the search of all courses', () => {
  it('"go": the course by its name, then the lessons, with what was found beside the field', () => {
    const page = draw({ mine: coursesMine, depths: lessonDepths, query: 'go' });
    expect(
      [...page.querySelectorAll('[data-course-card]')].map((card) => card.getAttribute('data-course-card')),
    ).toEqual(['go']);
    expect(cardOf(page, 'go').querySelector('h3 mark')!.textContent).toBe('Go');
    expect(page.querySelector('[data-courses-found]')!.textContent).toBe('1 course · 5 lessons');
    const lessons = page.querySelector('section[aria-labelledby="found-lessons"]')!;
    expect(lessons.querySelectorAll('li')).toHaveLength(5);
    // A learner sees where they stand on each lesson.
    expect(lessons.querySelectorAll('[data-square="learned"]')).toHaveLength(1);
    expect(lessons.textContent).toContain('Go · Modules');
    expect(page.querySelector('[aria-label="Clear the search"]')).not.toBeNull();
  });

  it('says what was found to a screen reader, and nothing while every course shows', () => {
    expect(draw().querySelector('[role="status"]')!.textContent).toBe('');
    expect(draw({ query: 'go' }).querySelector('[role="status"]')!.textContent).toBe('1 course, 5 lessons found.');
    expect(draw({ query: 'haskell' }).querySelector('[role="status"]')!.textContent).toBe('Nothing found.');
  });

  it("keeps a learner's square in its place before the depths come, so nothing moves", () => {
    const page = draw({ mine: coursesMine, depths: null, query: 'go' });
    const lessons = page.querySelector('section[aria-labelledby="found-lessons"]')!;
    expect(lessons.querySelectorAll('[data-square-slot]')).toHaveLength(5);
    expect(lessons.querySelector('[data-square]')).toBeNull();
    expect(draw({ query: 'go' }).querySelector('[data-square-slot]')).toBeNull();
  });

  it('draws a lesson of a course the learner never started as not started, without waiting for the depths', () => {
    const page = draw({ mine: coursesMine, depths: null, query: 'index' });
    const lessons = page.querySelector('section[aria-labelledby="found-lessons"]')!;
    expect(lessons.querySelector('[data-square-slot]')).toBeNull();
    expect(lessons.querySelectorAll('[data-square="none"]').length).toBeGreaterThan(0);
  });

  it('"hash", not signed in: lessons only, without squares', () => {
    const page = draw({ query: 'hash' });
    expect(page.querySelectorAll('[data-course-card]')).toHaveLength(0);
    expect(page.querySelector('[data-courses-found]')!.textContent).toMatch(/lessons$/);
    expect(page.querySelector('section[aria-labelledby="found-lessons"] [data-square]')).toBeNull();
  });

  it('"sort": the first six lessons, then the rest in place', () => {
    const page = draw({ query: 'sort' });
    const lessons = page.querySelector('section[aria-labelledby="found-lessons"]')!;
    expect(lessons.querySelectorAll('li')).toHaveLength(6);
    expect(lessons.querySelector('button')!.textContent).toMatch(/^Show \d+ more lessons?$/);
    const all = draw({ query: 'sort', drawn: { allLessons: true } });
    expect(all.querySelector('section[aria-labelledby="found-lessons"] button')).toBeNull();
  });

  it('nothing found: one button back to the full list', () => {
    const page = draw({ query: 'haskell' });
    const box = page.querySelector('[data-courses-nothing]')!;
    expect(box.querySelector('p')!.textContent).toBe('No course or lesson matches “haskell”.');
    expect(box.querySelector('button')!.textContent).toBe('Show all coursesEsc');
    expect(page.querySelector('section')).toBeNull();
  });

  it('never writes a long dash', () => {
    for (const props of [{}, { mine: coursesMine }, { query: 'go', mine: coursesMine, depths: lessonDepths }]) {
      expect(draw(props).textContent).not.toContain(LONG_DASH);
    }
  });
});

describe('all courses in the browser', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    window.history.replaceState(null, '', '/learn/courses');
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

  it('filters as it is typed and keeps it in the address; "/" finds and Esc clears', () => {
    act(() => root.render(<CoursesView courses={courseCards} lessons={lessonList} mine={null} depths={null} />));
    const input = host.querySelector('input')!;
    act(() => {
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(input);
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(input, 'python');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(window.location.pathname + window.location.search).toBe('/learn/courses?q=python');
    expect(host.querySelectorAll('[data-course-card]')).toHaveLength(1);
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(input.value).toBe('');
    expect(window.location.search).toBe('');
    expect(host.querySelectorAll('[data-course-card]')).toHaveLength(11);
  });

  it('opens the rest of the lessons in place', () => {
    act(() =>
      root.render(<CoursesView courses={courseCards} lessons={lessonList} mine={null} depths={null} query="sort" />),
    );
    const more = host.querySelector<HTMLButtonElement>('section[aria-labelledby="found-lessons"] button')!;
    act(() => more.focus());
    act(() => more.click());
    expect(host.querySelector('section[aria-labelledby="found-lessons"] button')).toBeNull();
    const links = host.querySelectorAll('section[aria-labelledby="found-lessons"] li a');
    expect(links.length).toBeGreaterThan(6);
    // The keyboard goes on from the first lesson the button showed.
    expect(document.activeElement).toBe(links[6]);
  });

  it('"Show all courses" and "Clear the search" leave the focus in the search field', () => {
    for (const name of ['Show all courses', 'Clear the search']) {
      act(() =>
        root.render(<CoursesView courses={courseCards} lessons={lessonList} mine={null} depths={null} query="zzzz" />),
      );
      const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
        (each) => each.textContent?.startsWith(name) || each.getAttribute('aria-label') === name,
      )!;
      act(() => button.focus());
      act(() => button.click());
      expect(host.querySelectorAll('[data-course-card]')).toHaveLength(11);
      expect(document.activeElement).toBe(host.querySelector('input'));
      act(() => root.unmount());
      root = createRoot(host);
    }
  });
});
