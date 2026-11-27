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
import {
  courseHrefOf,
  courseMarkdownHrefOf,
  courseProjectOf,
  LEARN_COURSES_MARKDOWN_PATH,
  LEARN_COURSES_PATH,
  learnLessonMarkdownPath,
  learnProjectIssuesPath,
} from './paths';
import {
  PROJECT_WRITTEN_BY,
  projectAuthorLineOf,
  projectCoversLineOf,
  projectGithubLabelOf,
  projectGitranksLabelOf,
  projectGitranksPathOf,
  projectOpenIssuesWordsOf,
} from './project-course';
import { absoluteUrl } from '@/lib/seo/site';
import { languageNameOf } from '@/lib/workspace/learn-question';

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
  if (course.kind !== 'TOPIC') return `${courseCardSubOf(course)}.`;
  const languages = course.languages.map(languageNameOf);
  return languages.length
    ? `${COURSE_KIND_LABELS.TOPIC}: it works in any language, with examples in ${languages.join(', ')}.`
    : `${COURSE_KIND_LABELS.TOPIC}: it works in any language.`;
}

/**
 * A project course's lines: its project's links (on GitHub, on GitRanks when it has a page there, its open issues
 * while it has some), who wrote it and when it was last checked against the code, and what an organisation's covers.
 */
function projectLinesOf(course: LearnCourse, openIssues: number | null): string | null {
  const { project } = course;
  const narrowed = courseProjectOf(course);
  if (!project || !narrowed) return null;
  const issues = projectOpenIssuesWordsOf(openIssues);
  return [
    `${projectGithubLabelOf(project)}: ${project.githubUrl}`,
    project.onGitranks ? `${projectGitranksLabelOf(project)}: ${absoluteUrl(projectGitranksPathOf(project))}` : null,
    issues ? `${issues}: ${absoluteUrl(learnProjectIssuesPath(narrowed))}` : null,
    [projectAuthorLineOf(project), projectCoversLineOf(project)].filter(Boolean).join(' '),
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * A course's copy: its name, what it is about, its kind, its count and numbers, then each group with
 * its lessons in order, each linked to its own copy with its level (a paused lesson is named, not linked: its address
 * answers that it is paused), and the course to take after it. A project course adds its project's lines, the
 * repository of each group of an organisation's course, and who wrote it at the end; its open issues come from a read
 * of their own (`openIssues`).
 */
export function learnCourseMarkdownOf(
  course: LearnCourse,
  { openIssues = null }: { openIssues?: number | null } = {},
): string {
  const sections = [
    `# ${oneLine(course.name)}`,
    [`The page: ${absoluteUrl(courseHrefOf(course))}`, `All courses: ${absoluteUrl(LEARN_COURSES_MARKDOWN_PATH)}`].join(
      '\n',
    ),
    course.about.trim(),
    [kindLineOf(course), courseCountLineOf(course), numbersLineOf(course)].filter(Boolean).join('\n'),
    projectLinesOf(course, openIssues) ?? '',
  ];
  for (const group of course.groups) {
    if (!group.lessons.length) continue;
    sections.push(
      group.repo ? `## ${oneLine(group.name)} (${oneLine(group.repo)})` : `## ${oneLine(group.name)}`,
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
      `[${oneLine(course.next.name)}](${absoluteUrl(courseMarkdownHrefOf(course.next))}): ${sentence(course.next.covers)}`,
    );
  }
  if (course.project) sections.push(`${PROJECT_WRITTEN_BY}.`);
  return `${sections.filter((section) => section.trim()).join('\n\n')}\n`;
}

/** A project course's language in the list, "In Python.", as the list's card shows it beside its name. */
const projectLanguageWordsOf = (course: Pick<LearnCourseCard, 'languages'>) =>
  course.languages[0] ? `In ${languageNameOf(course.languages[0])}.` : '';

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
          const language = course.project ? `${projectLanguageWordsOf(course)} ` : '';
          return `- [${oneLine(course.name)}](${absoluteUrl(courseMarkdownHrefOf(course))}): ${language}${sentence(course.covers)} ${lessonsWords(course.lessons)}.${numbers ? ` ${numbers}` : ''}`;
        })
        .join('\n'),
    );
  }
  if (!courses.length) sections.push('No course is open yet.');
  return `${sections.join('\n\n')}\n`;
}
