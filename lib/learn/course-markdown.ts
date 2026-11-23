import {
  COURSE_KIND_LABELS,
  courseCountLineOf,
  courseSectionsOf,
  goodShareOf,
  goodShareWords,
  LEVEL_WORDS,
  type LearnCourse,
  type LearnCourseCard,
  learnersOf,
  learnersWords,
  lessonsWords,
} from './course';
import { courseCardSubOf } from './course-share-card';
import { languageNameOf } from './learn-question';
import {
  courseMarkdownPath,
  coursePath,
  LEARN_COURSES_MARKDOWN_PATH,
  LEARN_COURSES_PATH,
  learnLessonMarkdownPath,
} from './paths';
import { absoluteUrl } from '@/lib/seo/site';

/*
 * The Markdown copies of a course and of all courses, for agents: what the pages show everyone, in their order, each
 * lesson and course linked to its own copy. Pure, so the routes, the specs and anything else that writes them agree.
 */

/** One line of text: a name or a title cannot start a heading or a list of its own. */
const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();

/** A line that ends as a sentence does. */
const sentence = (text: string) => (/[.!?]$/.test(oneLine(text)) ? oneLine(text) : `${oneLine(text)}.`);

/** A course's public numbers, each only when it is worth showing; null when none is. */
function numbersLineOf(course: Pick<LearnCourseCard, 'numbers'>): string | null {
  const learners = learnersOf(course.numbers);
  const good = goodShareOf(course.numbers);
  const parts = [learners !== null ? learnersWords(learners) : null, good !== null ? goodShareWords(good) : null];
  const shown = parts.filter((part): part is string => part !== null);
  return shown.length ? `${shown.join(' · ')}.` : null;
}

/** A course's kind and languages, as its page says them under its name. */
function kindLineOf(course: Pick<LearnCourse, 'kind' | 'languages'>): string {
  if (course.kind === 'LANGUAGE') return `${courseCardSubOf(course)}.`;
  const languages = course.languages.map(languageNameOf);
  return languages.length
    ? `${COURSE_KIND_LABELS.TOPIC}: it works in any language, with examples in ${languages.join(', ')}.`
    : `${COURSE_KIND_LABELS.TOPIC}: it works in any language.`;
}

/**
 * A course's copy: its name, what it is about, its kind, its count and numbers, then each group with
 * its lessons in order, each linked to its own copy with its level (a paused lesson is named, not linked: its address
 * answers that it is paused), and the course to take after it.
 */
export function learnCourseMarkdownOf(course: LearnCourse): string {
  const sections = [
    `# ${oneLine(course.name)}`,
    [
      `The page: ${absoluteUrl(coursePath(course.slug))}`,
      `All courses: ${absoluteUrl(LEARN_COURSES_MARKDOWN_PATH)}`,
    ].join('\n'),
    course.about.trim(),
    [kindLineOf(course), courseCountLineOf(course), numbersLineOf(course)].filter(Boolean).join('\n'),
  ];
  for (const group of course.groups) {
    if (!group.lessons.length) continue;
    sections.push(
      `## ${oneLine(group.name)}`,
      group.lessons
        .map((lesson, at) => {
          const level = LEVEL_WORDS[lesson.level] ?? lesson.level;
          return lesson.paused
            ? `${at + 1}. ${oneLine(lesson.title)} · ${level} · paused while we correct it`
            : `${at + 1}. [${oneLine(lesson.title)}](${absoluteUrl(learnLessonMarkdownPath(lesson.slug))}) · ${level}`;
        })
        .join('\n'),
    );
  }
  if (course.next) {
    sections.push(
      '## After this course',
      `[${oneLine(course.next.name)}](${absoluteUrl(courseMarkdownPath(course.next.slug))}): ${sentence(course.next.covers)}`,
    );
  }
  return `${sections.filter((section) => section.trim()).join('\n\n')}\n`;
}

/** The copy of all courses: each kind's section, each course linked to its own copy, what it covers and its count. */
export function learnCoursesMarkdownOf(courses: readonly LearnCourseCard[]): string {
  const sections = [
    '# All courses',
    [
      'Every course of GitRanks Learn: short lessons, each with one question.',
      `The page: ${absoluteUrl(LEARN_COURSES_PATH)}`,
    ].join('\n'),
  ];
  for (const section of courseSectionsOf(courses)) {
    sections.push(
      `## ${section.title}`,
      section.sub,
      section.courses
        .map((course) => {
          const numbers = numbersLineOf(course);
          return `- [${oneLine(course.name)}](${absoluteUrl(courseMarkdownPath(course.slug))}): ${sentence(course.covers)} ${lessonsWords(course.lessons)}.${numbers ? ` ${numbers}` : ''}`;
        })
        .join('\n'),
    );
  }
  if (!courses.length) sections.push('No course is open yet.');
  return `${sections.join('\n\n')}\n`;
}
