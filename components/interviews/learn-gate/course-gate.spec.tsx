// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { hint } = vi.hoisted(() => ({ hint: { present: false } }));
vi.mock('@/lib/session-hint', () => ({ hasSessionHint: () => hint.present }));

const { CoursePlansLine, LessonInterviewsNote, useCourseInterviews } = await import('./course-gate');
const { interviewSkillsCourse, northwindCourse } = await import('./__fixtures__/course');
const { CourseView } = await import('@/components/learn/course/course-view');
const { resetInterviewsViewer } = await import('@/components/interviews/interviews-viewer');
const { courseInterviewsOf } = await import('@/lib/interviews/learn-course');
const { forAlgorithmsCourse, forAlgorithmsOneCompany, forNorthwindCourse, tenCompanies } = await import(
  '@/lib/interviews/__fixtures__/learn-course'
);
const { northwind, tallgrass } = await import('@/lib/interviews/__fixtures__/companies');
const { algorithmsCourse, freshMine, otherCourses } = await import('@/lib/learn/__fixtures__/course');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LONG_DASH = String.fromCodePoint(0x2014);
const calls = { onSignIn: () => {}, onRate: async () => true };

type CourseViewProps = Parameters<typeof CourseView>[0];

function page(props: Partial<CourseViewProps> = {}) {
  const host = document.createElement('div');
  host.innerHTML = renderToStaticMarkup(
    <CourseView course={algorithmsCourse} mine={null} others={otherCourses} calls={calls} hints {...props} />,
  );
  return host;
}

/** The text a person reads: a company with no logo draws its first letter, which is not read. */
const read = (element: Element | null | undefined) => {
  if (!element) return null;
  const copy = element.cloneNode(true) as Element;
  for (const letter of copy.querySelectorAll('[data-company-letter]')) letter.remove();
  return copy.textContent?.replace(/\s+/g, ' ').trim() ?? null;
};
const textOf = (host: Element, selector: string) => read(host.querySelector(selector));
const groupLineOf = (host: Element, group: string) =>
  read(host.querySelector(`#group-${group}`)?.parentElement?.querySelector(':scope > span'));
const boxesOf = (host: Element) =>
  [...host.querySelectorAll('[data-course-boxes] > section')].map((box) => box.textContent ?? '');

describe('a course many plans use', () => {
  const host = page({ interviews: courseInterviewsOf(forAlgorithmsCourse) });

  it('names three companies under its row of facts, then counts the rest, each a link to its page', () => {
    expect(textOf(host, '[data-course-plans]')).toBe(
      'In the interview plans of Northwind, Tallgrass, Company 3 and 7 more.',
    );
    const links = [...host.querySelectorAll('[data-course-plans] a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/interviews/northwind', '/interviews/tallgrass', '/interviews/company-3']);
    expect(host.querySelector('[data-course-plans] button')!.textContent).toBe('7 more');
  });

  it('marks each group candidates report with "Asked at", up to three logos and how many more', () => {
    const arrays = host.querySelector('[data-asked-at="arrays-and-strings"]')!;
    expect(arrays.querySelectorAll('[data-company-logo]')).toHaveLength(3);
    expect(read(arrays)).toBe('Asked at+4Northwind, Tallgrass, Company 3, Company 4, Company 5, Company 6, Company 7');
    expect(arrays.getAttribute('title')).toBe(
      'Candidates report it at Northwind, Tallgrass, Company 3, Company 4, Company 5, Company 6, Company 7',
    );
    expect(arrays.querySelector('.sr-only')!.textContent).toContain('Company 7');
    expect(groupLineOf(host, 'trees')).toBe('Asked atNorthwind, Tallgrass, Company 3·12 lessons');
    expect(host.querySelector('[data-asked-at="trees"]')!.getAttribute('href')).toBe('/interviews');
    expect(host.querySelector('[data-asked-at="sorting-and-searching"]')!.getAttribute('href')).toBe(
      '/interviews/tallgrass',
    );
    expect(host.querySelector('[data-asked-at="big-o"]')!.getAttribute('title')).toBe(
      'Northwind, Tallgrass list it among their interview topics',
    );
  });

  it('keeps the line of a group nobody reports as it is today, never "asked at 0"', () => {
    expect(host.querySelector('[data-asked-at="linked-lists"]')).toBeNull();
    expect(groupLineOf(host, 'linked-lists')).toBe(groupLineOf(page(), 'linked-lists'));
    expect(host.textContent).not.toMatch(/\b0 /);
  });

  it('keeps its boxes, its head and its foot as they are', () => {
    const today = page();
    expect(boxesOf(host)).toEqual(boxesOf(today));
    expect(textOf(host, 'h1')).toBe(textOf(today, 'h1'));
    expect(textOf(host, '[data-course-facts]')).toBe(textOf(today, '[data-course-facts]'));
    expect(textOf(host, 'main > p:last-child')).toBe(textOf(today, 'main > p:last-child'));
  });

  it('names one company alone, and a course no plan uses has no line', () => {
    expect(textOf(page({ interviews: courseInterviewsOf(forAlgorithmsOneCompany) }), '[data-course-plans]')).toBe(
      'In the interview plans of Tallgrass.',
    );
    const none = page({ interviews: courseInterviewsOf({ ...forAlgorithmsCourse, companies: [] }) });
    expect(none.querySelector('[data-course-plans]')).toBeNull();
    expect(none.querySelector('[data-asked-at]')).not.toBeNull();
  });

  it('opens the rest of the companies in place, the keyboard on the first it named', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    await act(async () => {
      root.render(<CoursePlansLine companies={tenCompanies} />);
    });
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-course-plans] button')!.click();
    });
    expect(textOf(host, '[data-course-plans]')).toBe(
      `In the interview plans of ${tenCompanies
        .slice(0, 9)
        .map((company) => company.name)
        .join(', ')} and Company 10.`,
    );
    expect(host.querySelector('[data-course-plans] button')).toBeNull();
    expect(document.activeElement?.getAttribute('data-company-link')).toBe('company-4');
    act(() => root.unmount());
    host.remove();
  });
});

describe("a company's own course", () => {
  const own = courseInterviewsOf(forNorthwindCourse);
  const host = page({ course: northwindCourse, interviews: own });

  it("draws the company's logo before the name, and ends what it is about with the notice", () => {
    expect(host.querySelector('h1 [data-company-logo="northwind"]')?.getAttribute('width')).toBe('40');
    expect(textOf(host, 'h1')).toBe('Interviewing at Northwind');
    expect(textOf(host, 'header > p')).toBe(
      'How Northwind interviews engineers: what happens in each round, what it checks and how to get ready. Not an official Northwind page.',
    );
  });

  it('has one row with the kind and its lessons by round, and no choice of language', () => {
    expect(textOf(host, '[data-course-facts]')).toBe('Company course12 lessons, one group for each round');
    expect(host.querySelector('[data-course-examples]')).toBeNull();
    expect(host.querySelector('[data-course-plans]')).toBeNull();
  });

  it('leads to its plans in the middle, where other courses have the check', () => {
    const [first, middle, last] = boxesOf(host);
    expect(first).toContain('Start here');
    expect(middle).toBe(
      'Preparing for Northwind?Follow an interview planA plan puts these lessons, and lessons from other courses, in the order of the rounds for your position and level.See Northwind’s 7 plans⏎'.replace(
        '⏎',
        '',
      ),
    );
    expect(host.querySelectorAll('[data-course-boxes] > section')[1].querySelector('a')!.getAttribute('href')).toBe(
      '/interviews/northwind',
    );
    expect(last).toContain('Sign in');
    expect(host.querySelector('[data-course-boxes] [data-lit]')?.textContent).toBe(last);
  });

  it('keeps its plans for a learner, with the first lesson lit', () => {
    const mine = {
      ...freshMine,
      slug: northwindCourse.slug,
      next: { slug: 'how-northwind-hires-1', title: 'The steps from the first call to the offer' },
    };
    const learner = page({ course: northwindCourse, interviews: own, mine });
    const [first, middle] = boxesOf(learner);
    expect(middle).toContain('See Northwind’s 7 plans');
    expect(learner.querySelector('[data-course-boxes] [data-lit]')?.textContent).toBe(first);
  });

  it('says in its foot where its facts come from and the day they were checked', () => {
    expect(textOf(host, '[data-course-foot="company"]')).toBe(
      'Written by GitRanks from what Northwind states and what candidates report · Facts checked 26 Nov 2026 · How we research · Markdown version',
    );
    const [research, markdown] = [...host.querySelectorAll('[data-course-foot="company"] a')];
    expect(research.getAttribute('href')).toBe('/interviews/about#interviews-about-facts');
    expect(markdown.getAttribute('href')).toBe('/learn/courses/interviewing-at-northwind.md');
  });

  it('is an ordinary course while Interviews is closed to the viewer, with no language of examples', () => {
    const closed = page({ course: northwindCourse });
    expect(closed.querySelector('h1 [data-company-logo]')).toBeNull();
    expect(closed.textContent).not.toContain('Not an official');
    expect(closed.textContent).not.toContain('Examples in');
    expect(textOf(closed, '[data-course-lessons]')).toBe('12 lessons in 3 groups');
    expect(boxesOf(closed)[1]).toContain('How a lesson grows');
  });

  it('holds no long dash', () => {
    expect(host.textContent).not.toContain(LONG_DASH);
  });
});

describe('a course with no check', () => {
  it('offers the first lesson, and the check nowhere, to a visitor and to an experienced learner', () => {
    const visitor = page({ course: interviewSkillsCourse });
    expect(boxesOf(visitor)[0]).toContain('Start here');
    expect(visitor.textContent).not.toContain('Take the');
    const mine = { ...freshMine, slug: interviewSkillsCourse.slug, next: { slug: 'thinking-aloud-1', title: 'Say' } };
    const learner = page({ course: interviewSkillsCourse, mine, checkFirst: true });
    expect(learner.querySelector('[data-course-boxes] [data-lit]')?.textContent).toBe(boxesOf(learner)[0]);
    expect(learner.textContent).not.toContain('Take the check');
    expect(learner.textContent).not.toContain('Mark lessons you already know');
  });
});

describe("a lesson's sentence", () => {
  let host: HTMLDivElement;
  let root: Root;
  const fetchMock = vi.fn();

  const draw = (group: string, served: Parameters<typeof LessonInterviewsNote>[0]['served']) =>
    act(async () => {
      root.render(<LessonInterviewsNote course="algorithms" group={group} served={served} />);
    });
  const sentence = () => read(host.querySelector('[data-lesson-interviews]'));

  beforeEach(() => {
    resetInterviewsViewer();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => root.unmount());
    host.remove();
    hint.present = false;
    vi.unstubAllGlobals();
  });

  it('names one company, two, three, and from the fourth on counts the rest', async () => {
    await draw('sorting-and-searching', forAlgorithmsCourse);
    expect(sentence()).toBe('Candidates report sorting in interviews at Tallgrass.');
    await draw('graphs', forAlgorithmsCourse);
    expect(sentence()).toBe('Candidates report graphs in interviews at Northwind and Tallgrass.');
    await draw('trees', forAlgorithmsCourse);
    expect(sentence()).toBe('Candidates report trees in interviews at Northwind, Tallgrass and Company 3.');
    await draw('arrays-and-strings', forAlgorithmsCourse);
    expect(sentence()).toBe(
      'Candidates report arrays and strings in interviews at Northwind, Tallgrass, Company 3 and 4 more.',
    );
    expect(host.querySelectorAll('[data-lesson-interviews] a [data-company-logo]')).toHaveLength(3);
    expect(host.querySelector('[data-lesson-interviews] a')!.getAttribute('href')).toBe('/interviews/northwind');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('opens the rest of the companies in place', async () => {
    await draw('arrays-and-strings', forAlgorithmsCourse);
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-company-more]')!.click();
    });
    expect(sentence()).toBe(
      'Candidates report arrays and strings in interviews at Northwind, Tallgrass, Company 3, Company 4, Company 5, Company 6 and Company 7.',
    );
  });

  it('says the companies list the topic when every one states it on its own pages', async () => {
    await draw('big-o', forAlgorithmsCourse);
    expect(sentence()).toBe('Northwind and Tallgrass list complexity among their interview topics.');
  });

  it('says nothing where there is nothing to say', async () => {
    await draw('linked-lists', forAlgorithmsCourse);
    expect(host.innerHTML).toBe('');
    await draw('graphs', null);
    expect(host.innerHTML).toBe('');
  });

  it('asks nothing for a visitor, and only whether Interviews is open for a person it is closed to', async () => {
    fetchMock.mockImplementation(async () => Response.json({ open: false }));
    await draw('graphs', undefined);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(host.innerHTML).toBe('');
    // A new page: the document asks again.
    act(() => root.unmount());
    root = createRoot(host);
    resetInterviewsViewer();
    hint.present = true;
    await draw('trees', undefined);
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual(['/api/me/interviews/open']);
    expect(host.innerHTML).toBe('');
  });

  it('reads the course from the person’s route once Interviews is open to them', async () => {
    hint.present = true;
    fetchMock.mockImplementation(async (path: string) =>
      Response.json(path === '/api/me/interviews/open' ? { open: true } : { course: forAlgorithmsCourse }),
    );
    await draw('graphs', undefined);
    expect(fetchMock.mock.calls.map(([path]) => path)).toEqual([
      '/api/me/interviews/open',
      '/api/me/interviews/learn/algorithms',
    ]);
    expect(sentence()).toBe('Candidates report graphs in interviews at Northwind and Tallgrass.');
  });

  it('draws nothing when the route answers nothing', async () => {
    hint.present = true;
    fetchMock.mockImplementation(async (path: string) =>
      Response.json(path === '/api/me/interviews/open' ? { open: true } : { course: null }),
    );
    await draw('graphs', undefined);
    expect(host.innerHTML).toBe('');
  });
});

describe('what a course shows of Interviews, as this browser knows it', () => {
  it('follows the course it is asked for, and never shows the answer of another', async () => {
    resetInterviewsViewer();
    hint.present = true;
    const fetchMock = vi.fn(async (path: string) =>
      Response.json(
        path === '/api/me/interviews/open'
          ? { open: true }
          : { course: path.endsWith('/algorithms') ? forAlgorithmsCourse : forNorthwindCourse },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const seen: (string | null)[] = [];
    function Probe({ course }: { course: string }) {
      const interviews = useCourseInterviews(course);
      seen.push(interviews ? (interviews.own?.company.slug ?? `${interviews.companies.length} companies`) : null);
      return null;
    }
    const host = document.createElement('div');
    const root = createRoot(host);
    await act(async () => {
      root.render(<Probe course="algorithms" />);
    });
    expect(seen.at(-1)).toBe('10 companies');
    await act(async () => {
      root.render(<Probe course="interviewing-at-northwind" />);
    });
    expect(seen.at(-1)).toBe(northwind.slug);
    expect(seen).not.toContain(tallgrass.slug);
    act(() => root.unmount());
    hint.present = false;
    vi.unstubAllGlobals();
  });
});
