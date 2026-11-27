// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/react', () => ({ signIn: vi.fn() }));
vi.mock('@/lib/learn/course.actions', () => ({ sendLearnCourseFeedbackAction: vi.fn() }));

import { CourseLive } from './course-live';
import { CourseView, type CourseViewProps } from './course-view';
import { interviewSkillsCard } from '@/components/interviews/learn-gate/__fixtures__/courses';
import {
  algorithmsCourse,
  djangoCourse,
  freshMine,
  goCourse,
  otherCourses,
  progressMine,
} from '@/lib/learn/__fixtures__/course';
import type { LearnCourse } from '@/lib/learn/course';

/*
 * A course's page without Interviews' part, as a visitor and a learner get it while Interviews is closed: the stored
 * markup was drawn by the page before Interviews joined it, so any change to today's page shows here. Interview skills
 * (a course of the section with no code and no check) is drawn as today too.
 */

const calls = { onSignIn: () => {}, onRate: async () => true };

/** Interview skills whole: no languages, no check, two groups. */
const interviewSkillsCourse: LearnCourse = {
  ...interviewSkillsCard,
  about: 'How to think aloud, ask before you code and test by hand, in any interview.',
  groups: algorithmsCourse.groups.slice(0, 2),
  next: null,
  checkOffered: false,
  changedAt: '2026-11-20T09:00:00.000Z',
};

const PAGES: [string, Partial<CourseViewProps>][] = [
  ['a topic course, visitor', {}],
  ['a topic course, session pending', { person: 'pending' }],
  ['a topic course, learner not started, check first', { mine: freshMine, checkFirst: true }],
  ['a topic course, learner in progress', { mine: progressMine, openIssues: 3 }],
  ['a language course, visitor', { course: goCourse }],
  ['a repository course, visitor', { course: djangoCourse, projectIssues: 4 }],
  ['a course with no check, visitor', { course: interviewSkillsCourse }],
  [
    'a course with no check, learner not started',
    {
      course: interviewSkillsCourse,
      mine: { ...freshMine, slug: 'interview-skills' },
      checkFirst: true,
    },
  ],
];

const markupOf = (props: Partial<CourseViewProps>) =>
  renderToStaticMarkup(
    <CourseView course={algorithmsCourse} mine={null} others={otherCourses} calls={calls} hints {...props} />,
  );

describe("a course's page without Interviews' part", () => {
  it("is today's page, for a visitor and a learner, for each kind of course", async () => {
    const pages = PAGES.map(([name, props]) => `<!-- ${name} -->\n${markupOf(props)}\n`);
    await expect(pages.join('\n')).toMatchFileSnapshot('./__snapshots__/course-view-today.html');
  });
});

describe("the course page's own path while Interviews is closed", () => {
  it('draws the page as the view does before the person is known', () => {
    expect(renderToStaticMarkup(<CourseLive course={algorithmsCourse} others={otherCourses} />)).toBe(
      markupOf({ person: 'pending', hints: undefined }),
    );
  });
});
