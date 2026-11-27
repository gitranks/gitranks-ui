import { interviewSkillsCard, northwindCourseCard } from './courses';
import type { LearnCourse } from '@/lib/learn/course';
import type { LearnGroupLesson, LearnLessonLevel } from '@/lib/learn/lesson-page';

/*
 * The two courses of the section Interviews whole, as their pages read them: Northwind's own course, one group for
 * each round it prepares for, and Interview skills, a course with no code and no check.
 */

const lessonsOf = (group: string, titles: string[], level: LearnLessonLevel = 'EASY'): LearnGroupLesson[] =>
  titles.map((title, index) => ({ slug: `${group}-${index + 1}`, title, level, paused: false }));

/** Northwind's own course: 12 lessons, one group for each round, no languages and no check. */
export const northwindCourse: LearnCourse = {
  ...northwindCourseCard,
  about: 'How Northwind interviews engineers: what happens in each round, what it checks and how to get ready.',
  groups: [
    {
      slug: 'how-northwind-hires',
      name: 'How Northwind hires, and the recruiter call',
      lessons: lessonsOf('how-northwind-hires', [
        'The steps from the first call to the offer',
        'What the recruiter asks first',
        'Levels and what they mean at Northwind',
        'When to talk about pay',
      ]),
    },
    {
      slug: 'coding-interviews',
      name: 'Coding interviews',
      lessons: lessonsOf('coding-interviews', [
        'What a coding round looks like',
        'Talking while you code',
        'Testing your answer by hand',
        'When you are stuck',
      ]),
    },
    {
      slug: 'values-interview',
      name: 'The values interview',
      lessons: lessonsOf('values-interview', [
        'What Northwind means by its values',
        'A story in three parts',
        'A story about a mistake',
        'Questions to ask at the end',
      ]),
    },
  ],
  next: null,
  checkOffered: false,
  changedAt: '2026-11-20T09:00:00.000Z',
};

/** Interview skills whole: no languages, no check. */
export const interviewSkillsCourse: LearnCourse = {
  ...interviewSkillsCard,
  about: 'How to think aloud, ask before you code and test by hand, in any interview.',
  groups: [
    {
      slug: 'thinking-aloud',
      name: 'Thinking aloud',
      lessons: lessonsOf('thinking-aloud', ['Say what you are about to do', 'Name what you do not know']),
    },
    {
      slug: 'telling-your-story',
      name: 'Telling a clear story',
      lessons: lessonsOf('telling-your-story', ['A story in three parts', 'Keep it to two minutes']),
    },
  ],
  lessons: 4,
  next: null,
  checkOffered: false,
  changedAt: '2026-11-20T09:00:00.000Z',
};
