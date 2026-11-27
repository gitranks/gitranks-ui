// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CoursesView, type CoursesViewProps } from './courses-view';
import {
  coursesInterviews,
  hundredCompanies,
  twoCompaniesNoSection,
} from '@/components/interviews/learn-gate/__fixtures__/courses';
import { courseCards, coursesMine, kubernetesCourse, lessonList } from '@/lib/learn/__fixtures__/course';

/*
 * Interviews on the list of all courses (the boards of companies on Courses): the row under the search, the search
 * that knows a company, and the section Interviews. A visitor's list, and anyone's while Interviews is not open to
 * them, is today's.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LONG_DASH = String.fromCodePoint(0x2014);

const markup = (props: Partial<CoursesViewProps> = {}) =>
  renderToStaticMarkup(
    <CoursesView courses={courseCards} lessons={lessonList} mine={null} depths={null} hints {...props} />,
  );
function draw(props: Partial<CoursesViewProps> = {}) {
  const page = document.createElement('div');
  page.innerHTML = markup(props);
  return page;
}

const slugsOf = (page: Element, section?: string) =>
  [...page.querySelectorAll(`${section ? `section[aria-labelledby="${section}"] ` : ''}[data-course-card]`)].map(
    (card) => card.getAttribute('data-course-card'),
  );
const rowOf = (page: Element) => page.querySelector('[data-courses-companies]');
const cardOf = (page: Element, slug: string) => page.querySelector(`[data-course-card="${slug}"]`)!;

describe('the list of all courses while Interviews is not open to the viewer', () => {
  it("is today's list, byte for byte, with nothing of Interviews", () => {
    expect(markup({ interviews: null })).toBe(markup());
    expect(markup({ interviews: null, query: 'northwind' })).toBe(markup({ query: 'northwind' }));
    const page = draw();
    expect(rowOf(page)).toBeNull();
    expect(page.querySelector('section[aria-labelledby="interviews"]')).toBeNull();
    expect(page.textContent).not.toContain('interview');
  });
});

describe('the list of all courses with Interviews', () => {
  const page = draw({ interviews: coursesInterviews });

  it('draws the row under the search: the top five as links to their pages, then all companies', () => {
    const row = rowOf(page)!;
    // Tallgrass has no logo: its letter stands in the logo's square.
    expect(row.textContent).toBe('Preparing for an interview?NorthwindTTallgrassAll companies');
    expect([...row.querySelectorAll('a')].map((link) => link.getAttribute('href'))).toEqual([
      '/interviews/northwind',
      '/interviews/tallgrass',
      '/interviews',
    ]);
    // A logo where the company has one, its letter where it has none.
    expect(row.querySelector('[data-company-tag="northwind"] img')!.getAttribute('src')).toBe(
      '/interviews/northwind/logo-64.png',
    );
    expect(row.querySelector('[data-company-tag="tallgrass"] [data-company-letter]')!.textContent).toBe('T');
    // It sits under the search, before the first section.
    expect(row.parentElement!.previousElementSibling!.querySelector('input')).not.toBeNull();
  });

  it('draws the section Interviews last: Interview skills, then each company course with its logo', () => {
    expect([...page.querySelectorAll('section h2')].map((h2) => h2.textContent)).toEqual([
      'Topics, in any language',
      'Languages',
      'Interviews',
    ]);
    const section = page.querySelector('section[aria-labelledby="interviews"]')!;
    expect(section.querySelector('h2 + span')!.textContent).toBe('What each company asks, round by round.');
    expect(slugsOf(page, 'interviews')).toEqual(['interview-skills', 'interviewing-at-northwind']);
    expect(cardOf(page, 'interview-skills').querySelector('[data-company-logo]')).toBeNull();
    const own = cardOf(page, 'interviewing-at-northwind');
    expect(own.getAttribute('href')).toBe('/learn/courses/interviewing-at-northwind');
    expect(own.querySelector('[data-company-logo="northwind"]')!.nextElementSibling!.tagName).toBe('H3');
    expect(section.querySelector('button')).toBeNull();
    // At rest a course names no company.
    expect(page.querySelector('[data-course-uses]')).toBeNull();
  });

  it('"northwind": the courses its plans use, each with one line that says why, the row unchanged', () => {
    const found = draw({ interviews: coursesInterviews, query: 'northwind' });
    expect(slugsOf(found)).toEqual(['algorithms', 'interview-skills', 'interviewing-at-northwind']);
    expect(found.querySelector('[data-courses-found]')!.textContent).toBe('3 courses');
    expect(cardOf(found, 'algorithms').querySelector('[data-course-uses]')!.textContent).toBe(
      'NorthwindOnline assessment and coding interviews · 32 lessons',
    );
    expect(cardOf(found, 'interview-skills').querySelector('[data-course-uses]')!.textContent).toBe(
      'NorthwindRecruiter call and coding interviews · all 11 lessons',
    );
    // The line stands between what the course covers and its numbers.
    const uses = cardOf(found, 'algorithms').querySelector('[data-course-uses]')!;
    expect(uses.previousElementSibling!.textContent).toBe('How to store data and work through it fast');
    expect(uses.nextElementSibling!.hasAttribute('data-course-stats')).toBe(true);
    expect(rowOf(found)!.textContent).toBe(rowOf(page)!.textContent);
  });

  it('a signed-in learner keeps their own figure on a course a company typed finds', () => {
    const found = draw({ interviews: coursesInterviews, query: 'northwind', mine: coursesMine });
    const algorithms = cardOf(found, 'algorithms');
    expect(algorithms.querySelector('[data-course-stats]')!.textContent).toMatch(/^10 of 86 learned/);
    expect(algorithms.querySelector('[data-course-uses]')!.textContent).toContain('32 lessons');
  });

  it('"go": Go, and Kubernetes because it is written in Go; no company line', () => {
    const found = draw({
      interviews: coursesInterviews,
      courses: [...courseCards, { ...kubernetesCourse }],
      query: 'go',
    });
    expect(slugsOf(found)).toEqual(['go', 'kubernetes']);
    expect(found.querySelector('[data-course-uses]')).toBeNull();
  });

  it('only two companies, no course of the section yet: the row with the two, and no section', () => {
    const two = draw({ interviews: twoCompaniesNoSection });
    expect(rowOf(two)!.querySelectorAll('[data-company-tag]')).toHaveLength(2);
    expect(two.querySelector('section[aria-labelledby="interviews"]')).toBeNull();
  });

  it('never writes a long dash, the word claim, or a zero', () => {
    for (const props of [
      { interviews: coursesInterviews },
      { interviews: coursesInterviews, query: 'northwind' },
      { interviews: coursesInterviews, query: 'tallgrass', mine: coursesMine },
      { interviews: hundredCompanies },
    ]) {
      const text = draw(props).textContent ?? '';
      expect(text).not.toContain(LONG_DASH);
      expect(text.toLowerCase()).not.toContain('claim');
      expect(text).not.toMatch(/\b0 (lessons?|courses?|companies)\b/);
    }
  });
});

describe('the section Interviews with a hundred companies', () => {
  it('shows Interview skills and the top five, then one button that opens the rest in place', () => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    act(() =>
      root.render(
        <CoursesView
          courses={courseCards}
          lessons={lessonList}
          mine={null}
          depths={null}
          interviews={hundredCompanies}
        />,
      ),
    );
    expect(slugsOf(host, 'interviews')).toEqual([
      'interview-skills',
      'interviewing-at-company-3',
      'interviewing-at-company-1',
      'interviewing-at-company-4',
      'interviewing-at-company-5',
      'interviewing-at-company-9',
    ]);
    // The row keeps its five.
    expect(rowOf(host)!.querySelectorAll('[data-company-tag]')).toHaveLength(5);
    const button = host.querySelector<HTMLButtonElement>('section[aria-labelledby="interviews"] button')!;
    expect(button.textContent).toBe('Show all 101 courses');
    const before = slugsOf(host, 'interviews');
    act(() => button.focus());
    act(() => button.click());
    const after = slugsOf(host, 'interviews');
    expect(after).toHaveLength(101);
    // The courses shown stay where they were; the rest come after them.
    expect(after.slice(0, 6)).toEqual(before);
    expect(after[6]).toBe('interviewing-at-company-2');
    expect(host.querySelector('section[aria-labelledby="interviews"] button')).toBeNull();
    // The keyboard goes on from the first course the button showed.
    expect(document.activeElement!.getAttribute('data-course-card')).toBe('interviewing-at-company-2');
    act(() => root.unmount());
    host.remove();
  });

  it('a search shows every course of the section it finds', () => {
    const found = draw({ interviews: hundredCompanies, query: 'interviewing' });
    expect(slugsOf(found, 'interviews')).toHaveLength(100);
    expect(found.querySelector('section[aria-labelledby="interviews"] button')).toBeNull();
  });
});
