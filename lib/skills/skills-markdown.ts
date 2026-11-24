import { skillsPath, skillsProfilePath } from './paths';
import type { SkillsCourse, SkillsFix, SkillsPage } from './skills.types';
import { COURSE_KIND_WORDS, courseCountsOf, finishedWordsOf, groupCountOf, notStartedLineOf } from './skills-courses';
import { countOf, figureWordsOf, type LinePart, PRODUCT_NAMES, shownFigures, sinceLineOf } from './skills-figures';
import { fixesLineOf, fixLessonOf, fixLinksOf, fixStateWordsOf, MADE_WORDS, namesProduct } from './skills-fixes';
import { coursePath, LEARN_HOME_PATH, learnLessonPath } from '@/lib/learn/paths';
import { absoluteUrl } from '@/lib/seo/site';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';
import type { LearnFixMade } from '@/lib/workspace/pull-request-page.types';

/*
 * A Skills page's Markdown copy, for agents: what the page shows everyone, in its order. Pure, from the public answer.
 */

/** One line of text: a title cannot start a heading or a list of its own. */
const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim();

/** Square brackets in a link's words would end the link early. */
const linkWords = (text: string) => oneLine(text).replace(/[[\]]/g, '');

const link = (words: string, path: string) => `[${linkWords(words)}](${absoluteUrl(path)})`;

/** Where each product's name leads: its landing. */
const PRODUCT_PATHS: Record<LearnFixMade, string> = { CONTRIBUTE: WORKSPACE_PATHS.contribute, LEARN: LEARN_HOME_PATH };

/** A line of words and products, each product's name a link to its landing. */
const lineOf = (parts: readonly LinePart[]) =>
  parts
    .map((part) => (typeof part === 'string' ? part : link(PRODUCT_NAMES[part.product], PRODUCT_PATHS[part.product])))
    .join('');

/** One fix: its title (a link to our page when it has one), the project, its state and its two GitHub links. */
function fixLineOf(fix: SkillsFix, { both, now }: { both: boolean; now: Date }) {
  const links = fixLinksOf(fix);
  const lesson = fixLessonOf(fix);
  const parts = [
    links.title ? link(fix.title, links.title) : oneLine(fix.title),
    fix.repo,
    fix.language,
    both ? MADE_WORDS[fix.made] : null,
    fixStateWordsOf(fix, now),
    `[Issue #${fix.issueNumber}](${fix.issueUrl})`,
    `[PR #${fix.number}](${fix.url})`,
    lesson ? `${lesson.verb} ${link(lesson.lesson.title, learnLessonPath(lesson.lesson.slug))}` : null,
    links.made && links.made !== links.title ? link('How it was made', links.made) : null,
  ];
  return `- ${parts.filter(Boolean).join(' · ')}`;
}

/** One course: its name, its kind and counts, each group started with its count, and the groups not started. */
function courseSectionOf(course: SkillsCourse, now: Date): string {
  const kind = COURSE_KIND_WORDS[course.course.kind] ?? 'Course';
  const finished = finishedWordsOf(course, now);
  const notStarted = notStartedLineOf(course.notStarted);
  return [
    `### ${link(course.course.name, coursePath(course.course.slug))}`,
    '',
    `${[kind, courseCountsOf(course), finished].filter(Boolean).join(' · ')}.`,
    '',
    ...course.groups.map((group) => `- ${oneLine(group.name)}: ${groupCountOf(group)}`),
    ...(notStarted ? ['', notStarted] : []),
  ].join('\n');
}

/** The copy: the heading, the numbers with their line, the fixes, and the courses. */
export function skillsMarkdownOf(page: SkillsPage, { now }: { now: Date }): string {
  const { numbers } = page;
  const figures = shownFigures(numbers.figures).map((figure) => {
    const words = figureWordsOf(figure, numbers.kind, numbers.fixes);
    return `- **${words.value}** ${words.label}${words.under ? `, ${words.under}` : ''}`;
  });
  const made: readonly LearnFixMade[] = numbers.made;
  const both = namesProduct(made);
  const rows = page.fixes.rows.map((fix) => fixLineOf(fix, { both, now }));
  const more = page.fixes.total - page.fixes.rows.length;
  const { courses } = page;

  const sections = [
    `# ${page.login}’s skills`,
    `What ${page.login} proved with GitRanks: ${link(`${page.login}’s profile`, skillsProfilePath(page.login))}. The page: ${absoluteUrl(skillsPath(page.login))}`,
    ...(figures.length ? [`## In numbers\n\n${figures.join('\n')}\n\n${lineOf(sinceLineOf(numbers))}`] : []),
    ...(rows.length
      ? [
          [
            '## Fixes in real projects',
            '',
            lineOf(fixesLineOf(made, page.login)),
            '',
            ...rows,
            ...(more > 0 ? ['', `And ${countOf(more)} more on the page.`] : []),
          ].join('\n'),
        ]
      : []),
    ...(courses.length ? ['## Courses', ...courses.map((course) => courseSectionOf(course, now))] : []),
  ];
  return `${sections.join('\n\n')}\n`;
}
