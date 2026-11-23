import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CourseShareCard, LearnShareCard } from './course-cards';
import { algorithmsCourse, courseCards } from '@/lib/learn/__fixtures__/course';
import { coursesCardFiguresOf } from '@/lib/learn/course-share-card';

const LONG_DASH = String.fromCodePoint(0x2014);

describe("a course's picture", () => {
  it('draws the name, its kind and languages, its lessons, its learners and its address', () => {
    const html = renderToStaticMarkup(<CourseShareCard course={algorithmsCourse} />);
    for (const text of [
      'COURSE',
      'Algorithms and data structures',
      'A topic course, with examples in 7 languages',
      '86',
      'lessons',
      '1,240',
      'learners',
      'gitranks.com/learn/courses/algorithms',
    ]) {
      expect(html, text).toContain(text);
    }
    expect(html).not.toContain(LONG_DASH);
  });

  it('leaves the learners out under 10', () => {
    const html = renderToStaticMarkup(
      <CourseShareCard course={{ ...algorithmsCourse, numbers: { learners: 9, goodShare: null } }} />,
    );
    expect(html).not.toContain('learners');
    expect(html).not.toContain('>9<');
  });
});

describe('the picture of all courses', () => {
  it('draws the headline, the courses and their lessons', () => {
    const html = renderToStaticMarkup(<LearnShareCard figures={coursesCardFiguresOf(courseCards)} />);
    for (const text of ['LEARN', 'Learn one idea in two minutes.', '11', 'courses', '961', 'lessons']) {
      expect(html, text).toContain(text);
    }
    expect(html).not.toContain(LONG_DASH);
  });
});
