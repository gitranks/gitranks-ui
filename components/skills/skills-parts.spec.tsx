// @vitest-environment jsdom
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { SkillsBlock } from './skills-block';
import { SkillsCourseCard } from './skills-course-card';
import { SkillsCoursesSection } from './skills-courses';
import { SkillsFixRow } from './skills-fix-row';
import { SkillsMissing } from './skills-missing';
import { SkillsNumbersBox } from './skills-numbers-box';
import {
  algorithmsCourse,
  bothNumbers,
  contributorFixes,
  contributorNumbers,
  databasesCourse,
  firstFixNumbers,
  firstLessonCourse,
  hiddenPageFix,
  learnerFixes,
  learnerNumbers,
  openOnlyNumbers,
  repoCourse,
} from '@/lib/skills/__fixtures__/skills';

const LONG_DASH = String.fromCodePoint(0x2014);

function draw(node: ReactElement) {
  const root = document.createElement('div');
  root.innerHTML = renderToStaticMarkup(node);
  const text = root.textContent ?? '';
  expect(text).not.toContain(LONG_DASH);
  expect(text.toLowerCase()).not.toContain('claim');
  return { root, text, hrefs: [...root.querySelectorAll('a')].map((a) => a.getAttribute('href')) };
}

const figures = (root: HTMLElement) =>
  [...root.querySelectorAll('[data-figure]')].map((one) => one.getAttribute('data-figure'));

describe('SkillsNumbersBox', () => {
  it('draws four numbers, the agent in plain words', () => {
    const { root, text } = draw(<SkillsNumbersBox numbers={contributorNumbers} />);
    expect(figures(root)).toEqual(['FIXES_MERGED', 'DAYS_ACTIVE', 'HELPED', 'AGENT']);
    expect(text).toContain('Claude Code');
    expect(text).toContain('also Codex');
  });

  it('draws the first fix and pull requests open, none merged', () => {
    expect(draw(<SkillsNumbersBox numbers={firstFixNumbers} />).text).toContain('for this fix');
    expect(draw(<SkillsNumbersBox numbers={openOnlyNumbers} />).text).toContain('pull requests open');
  });

  it('never draws a zero, and nothing with nothing to show', () => {
    const zero = { ...contributorNumbers.figures[2], value: 0 };
    const { root } = draw(
      <SkillsNumbersBox numbers={contributorNumbers} figures={[contributorNumbers.figures[0], zero]} />,
    );
    expect(figures(root)).toEqual(['FIXES_MERGED']);
    expect(renderToStaticMarkup(<SkillsNumbersBox numbers={contributorNumbers} figures={[zero]} />)).toBe('');
  });

  it('lets an odd last number take the whole row on a phone', () => {
    const { root } = draw(<SkillsNumbersBox numbers={learnerNumbers} figures={learnerNumbers.blockFigures} />);
    expect(root.querySelector('[data-figure="DAYS_ACTIVE"]')?.className).toContain('max-sm:col-span-2');
  });
});

describe('SkillsFixRow', () => {
  it('draws a Contribute fix, merged, with both links to its timeline and its GitHub chips', () => {
    const { text, hrefs } = draw(<SkillsFixRow fix={contributorFixes[0]} />);
    expect(text).toContain('The retry list grows without limit');
    expect(text).toContain('merged 20 Nov');
    expect(text).toContain('How it was made');
    expect(hrefs.filter((href) => href === '/contribute/pr/harbor-kit/relay/58')).toHaveLength(2);
    expect(hrefs).toContain('https://github.com/harbor-kit/relay/pull/58');
  });

  it('draws a Learn fix with its lesson, and which product made it when asked', () => {
    const { text, hrefs } = draw(<SkillsFixRow fix={learnerFixes[2]} namesProduct />);
    expect(text).toContain('open, in review');
    expect(text).toContain('with Learn');
    expect(text).toContain('A hash map stores values by key');
    expect(hrefs).toContain('/learn/fixes/honojs/hono/3196');
  });

  it('keeps a hidden fix’s GitHub links alone', () => {
    const { text, hrefs } = draw(<SkillsFixRow fix={hiddenPageFix} />);
    expect(text).not.toContain('How it was made');
    expect(hrefs.every((href) => href?.startsWith('https://github.com/'))).toBe(true);
  });
});

describe('SkillsCourseCard and SkillsCoursesSection', () => {
  it('draws a course with its groups, its squares and the groups not started', () => {
    const { root, text } = draw(<SkillsCourseCard course={algorithmsCourse} />);
    expect(text).toContain('23 of 86 lessons learned · 6 practised · 1 mastered');
    expect(root.querySelectorAll('[data-group]')).toHaveLength(4);
    expect(root.querySelectorAll('[data-lesson]')).toHaveLength(36);
    expect(root.querySelectorAll('[data-star]').length).toBeGreaterThan(0);
    expect(text).toContain('Not started: Linked lists, Trees');
  });

  it('marks a finished course, and names a course about a repository', () => {
    expect(draw(<SkillsCourseCard course={databasesCourse} />).text).toContain('Finished on 12 Nov');
    expect(draw(<SkillsCourseCard course={repoCourse} />).text).toContain('Repository course');
    expect(draw(<SkillsCourseCard course={firstLessonCourse} />).text).toContain('1 of 86 lessons learned');
  });

  it('draws the legend, with the star only when a merged fix used a lesson', () => {
    expect(draw(<SkillsCoursesSection courses={[algorithmsCourse]} />).text).toContain('A merged fix used this lesson');
    const plain = draw(<SkillsCoursesSection courses={[databasesCourse]} />);
    expect(plain.text).toContain('Mastered: right again 10 days after that, or used in a merged fix');
    expect(plain.text).not.toContain('A merged fix used this lesson');
    expect(renderToStaticMarkup(<SkillsCoursesSection courses={[]} />)).toBe('');
  });
});

describe('SkillsBlock', () => {
  it('draws three numbers at most and one link that names what the tab lists', () => {
    const { root, text, hrefs } = draw(<SkillsBlock login="octocat" numbers={contributorNumbers} />);
    expect(figures(root)).toHaveLength(3);
    expect(text).toContain('Skills');
    expect(text).toContain('All 6 fixes');
    expect(hrefs).toContain('/profile/octocat/skills');
    expect(draw(<SkillsBlock login="octocat" numbers={learnerNumbers} />).text).toContain('All 3 courses');
    expect(draw(<SkillsBlock login="octocat" numbers={bothNumbers} />).text).toContain('All fixes and courses');
  });

  it('tells the owner of a hidden or private page', () => {
    expect(draw(<SkillsBlock login="octocat" numbers={learnerNumbers} ownState="HIDDEN" />).text).toContain(
      'Only you see this block. Your Skills page is hidden.Open your Skills page',
    );
    const own = draw(<SkillsBlock login="octocat" numbers={learnerNumbers} ownState="PRIVATE" />);
    expect(own.root.querySelector('[data-skills-block-owner]')?.textContent).toBe('Only you see this block.');
  });

  it('draws nothing with nothing to show', () => {
    expect(renderToStaticMarkup(<SkillsBlock login="octocat" numbers={null} />)).toBe('');
  });
});

describe('SkillsMissing', () => {
  it('says so and leads to the profile', () => {
    const { text, hrefs } = draw(<SkillsMissing login="octocat" />);
    expect(text).toContain('octocat has no Skills page');
    expect(text).toContain('Open octocat’s profile');
    expect(hrefs).toEqual(['/profile/octocat']);
  });
});
