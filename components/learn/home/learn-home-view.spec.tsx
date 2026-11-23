// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LearnHomeError, LearnHomeView, type LearnHomeViewProps } from './learn-home-view';
import {
  HOME_NOW,
  homeAllDone,
  homeCoursesDone,
  homeDay,
  homeDoneToday,
  homeFirstDays,
  homeNewLearner,
  homeNoCourses,
  homeNothingDue,
  homeSetup,
} from '@/lib/learn/__fixtures__/learn-home-page';
import type { LearnHomeRead } from '@/lib/learn/home';

const LONG_DASH = String.fromCodePoint(0x2014);

function draw(home: LearnHomeRead, props: Partial<LearnHomeViewProps> = {}) {
  const page = document.createElement('div');
  page.innerHTML = renderToStaticMarkup(
    <LearnHomeView home={home} setup={homeSetup} now={HOME_NOW} timeZone={null} hints {...props} />,
  );
  return page;
}

const words = (element: Element | null) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
const boxes = (page: Element) => [...page.querySelectorAll('[data-home-boxes] > *')];
const lit = (page: Element) => page.querySelectorAll('[data-lit]');
const enter = (page: Element) => [...page.querySelectorAll('[data-course-enter]')];

describe('Learn home, a normal day', () => {
  const page = draw(homeDay);

  it('has the next lesson and the review, the review lit and taking Enter', () => {
    const [lesson, review] = boxes(page);
    expect(words(lesson)).toContain('Next for you');
    expect(words(lesson)).toContain('Count things with a hash map');
    expect(words(lesson)).toContain('Algorithms and data structures');
    expect(lesson.querySelector('a')?.getAttribute('href')).toBe('/learn/lessons/count-things-with-a-hash-map');
    expect(words(review)).toContain('6 lessons to repeat');
    expect(words(review)).toContain('About 5 minutes, from 2 courses.');
    expect(review.hasAttribute('data-lit')).toBe(true);
    expect(lit(page)).toHaveLength(1);
    expect(enter(page).map((link) => words(link))).toEqual(['Review now⏎']);
  });

  it('lets R open the review while it is lit, its hint left to Enter', () => {
    const review = page.querySelector('[data-course-key="R"]');
    expect(review?.getAttribute('href')).toBe('/learn/review');
    expect(review?.hasAttribute('data-course-enter')).toBe(true);
    expect(words(review)).toBe('Review now⏎');
  });

  it('gives its text links a 44px target on a phone', () => {
    const links = [
      ...page.querySelectorAll('[data-home-foot] a'),
      ...page.querySelectorAll('[data-course-columns] a'),
      page.querySelector('[data-add-course] a'),
      page.querySelector('a[href="/learn/progress"]'),
      page.querySelector('[data-home-section="other"] a[href="/learn/courses"]'),
    ];
    expect(links.length).toBeGreaterThan(5);
    for (const link of links) expect(link?.className, link?.textContent ?? '').toContain('max-sm:min-h-11');
  });

  it('lists your courses with the totals and a card to add one, then the other courses', () => {
    expect(words(page.querySelector('[data-home-totals]'))).toBe('13 lessons learned · 4 practised · 1 mastered');
    expect(page.querySelectorAll('[data-my-courses] > li')).toHaveLength(3);
    expect(page.querySelector('[data-add-course] a')?.getAttribute('href')).toBe('/learn/courses');
    const other = page.querySelector('[data-home-section="other"]');
    expect(other?.querySelector('[data-course-columns]')).not.toBeNull();
    expect(other?.innerHTML).not.toContain('/learn/courses/go"');
  });

  it("ends with the foot: How Learn works, maintainers, and today's Learn, the only link to it", () => {
    const links = [...page.querySelectorAll('[data-home-foot] a')].map((a) => [words(a), a.getAttribute('href')]);
    expect(links).toEqual([
      ['How Learn works', '/learn/about'],
      ['For maintainers', '/learn/maintainers'],
      ['Fix a real issue with your agent', '/learn/earlier'],
    ]);
  });

  it('has no long dash and no zero count anywhere', () => {
    expect(page.textContent).not.toContain(LONG_DASH);
    expect(page.textContent).not.toMatch(/\b0 (lessons?|practised|mastered)/);
  });

  it('shows no key hint when the browser has no keyboard', () => {
    expect(draw(homeDay, { hints: false }).querySelector('kbd')).toBeNull();
  });
});

describe("Learn home's other days", () => {
  it('lights the next lesson when nothing is due, and says when the next review comes', () => {
    const page = draw(homeNothingDue);
    const [lesson, review] = boxes(page);
    expect(lesson.hasAttribute('data-lit')).toBe(true);
    expect(review.hasAttribute('data-quiet')).toBe(true);
    expect(words(review)).toContain('Nothing to repeat today');
    expect(words(review)).toContain('Next: 3 lessons on Monday.');
    expect(enter(page).map((link) => words(link))).toEqual(['Start lesson⏎']);
    // Nothing due: no review to open, so R has nothing to press.
    expect(page.querySelector('[data-course-key="R"]')).toBeNull();
  });

  it('says the review is done for today', () => {
    const review = boxes(draw(homeDoneToday))[1];
    expect(words(review)).toContain('Done for today');
    expect(words(review)).toContain('You repeated 6 lessons. Next: 3 lessons on Monday.');
  });

  it('says when the first review comes', () => {
    expect(words(boxes(draw(homeFirstDays))[1])).toContain('Your first review is in 3 days');
  });

  it('offers the next course once every course started is finished, the review still lit', () => {
    const page = draw(homeCoursesDone);
    const [lesson, review] = boxes(page);
    expect(words(lesson)).toContain('Pick your next course');
    expect(words(lesson)).toContain('You finished Go. Databases and SQL is a good next step');
    expect(lesson.querySelector('a')?.getAttribute('href')).toBe('/learn/courses/databases');
    expect(review.hasAttribute('data-lit')).toBe(true);
  });

  it('has both boxes quiet once every course is finished and nothing is due, and no other courses', () => {
    const page = draw(homeAllDone);
    expect(lit(page)).toHaveLength(0);
    expect(enter(page)).toHaveLength(0);
    expect(words(boxes(page)[0])).toContain('You finished every course we have');
    expect(words(boxes(page)[1])).toContain('Next: 12 lessons on 9 Nov.');
    expect(page.querySelector('[data-home-section="other"]')).toBeNull();
  });
});

describe("a new learner's Learn home", () => {
  it('asks to pick a first course from the suggested ones, the first lit, and says whom they are for', () => {
    const page = draw(homeNewLearner);
    expect(page.querySelector('[data-home-boxes]')).toBeNull();
    const first = page.querySelector('[data-home-first-course]');
    expect(words(first?.querySelector('h1') ?? null)).toBe('Pick your first course');
    expect(words(first)).toContain('Suggested for Go and Python, experienced developer · Change');
    const suggested = [...page.querySelectorAll('[data-suggested] > li')];
    expect(suggested.map((li) => words(li).split('Topic course')[0].split('Language course')[0])).toEqual([
      'Your main language',
      'Where most people start',
      'Another language you use',
    ]);
    expect(lit(page)).toHaveLength(1);
    expect(suggested[0].querySelector('[data-lit]')).not.toBeNull();
    expect(page.querySelector('[data-home-section="yours"]')).toBeNull();
    expect(page.querySelector('[data-home-section="other"]')).not.toBeNull();
  });

  it('leaves out whom they are for with no language set up', () => {
    const page = draw(homeNewLearner, { setup: null });
    expect(words(page.querySelector('[data-home-first-course]'))).not.toContain('Suggested for');
  });

  it('sends to all courses when the API has none to suggest, and draws no empty section', () => {
    const page = draw(homeNoCourses);
    expect(page.querySelector('[data-suggested]')).toBeNull();
    expect(words(page.querySelector('[data-home-first-course]'))).toContain(
      'See all courses and start the one you like.',
    );
    expect(page.querySelector('[data-home-section="other"]')).toBeNull();
    expect(page.querySelector('[data-home-section="yours"]')).toBeNull();
    expect(page.querySelector('[data-home-foot]')).not.toBeNull();
  });
});

describe('Learn home that could not be read', () => {
  it('says so, with a way to try again, all courses and the foot', () => {
    const page = document.createElement('div');
    page.innerHTML = renderToStaticMarkup(<LearnHomeError />);
    expect(page.querySelector('[data-learn-home="error"]')).not.toBeNull();
    expect(words(page.querySelector('h1'))).toBe('Learn home did not load');
    const links = [...page.querySelectorAll('section a')].map((a) => [words(a), a.getAttribute('href')]);
    expect(links).toEqual([
      ['Try again', '/learn'],
      ['See all courses', '/learn/courses'],
    ]);
    expect(page.querySelector('[data-home-foot]')).not.toBeNull();
  });
});
