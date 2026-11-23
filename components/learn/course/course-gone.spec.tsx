// @vitest-environment jsdom
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CourseGoneView } from './course-gone';
import { courseGoneTextOf, LEARN_MISSING_TEXT } from '@/lib/learn/course-gone';

const LONG_DASH = String.fromCodePoint(0x2014);

const draw = (props: ComponentProps<typeof CourseGoneView>) => {
  const page = document.createElement('div');
  page.innerHTML = renderToStaticMarkup(<CourseGoneView {...props} />);
  return page;
};

describe("a gone course's page, and a page that does not exist", () => {
  it('has one title, one sentence and the one way on, to all courses', () => {
    for (const [text, state] of [
      [courseGoneTextOf('PAUSED', { title: 'Algorithms and data structures' }), 'paused'],
      [courseGoneTextOf('REMOVED', { title: 'Algorithms and data structures' }), 'removed'],
      [LEARN_MISSING_TEXT, 'missing'],
    ] as const) {
      const page = draw({ text, state });
      expect(page.querySelector('main')!.getAttribute('data-course-gone')).toBe(state);
      expect(page.querySelectorAll('h1')).toHaveLength(1);
      expect(page.querySelector('h1')!.textContent).toBe(text.title);
      expect(page.textContent).toContain(text.eyebrow);
      expect(page.textContent).toContain(text.lead);
      const links = page.querySelectorAll('a');
      expect(links).toHaveLength(1);
      expect(links[0].getAttribute('href')).toBe('/learn/courses');
      expect(links[0].textContent).toBe('See all courses');
      expect(page.textContent).not.toContain(LONG_DASH);
    }
  });
});
