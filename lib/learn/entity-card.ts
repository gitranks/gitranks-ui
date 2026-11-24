import type { Route } from 'next';

import { LEARN_ISSUES_PAGE_BUILT, LEARN_PROJECT_COURSE_PAGE_BUILT } from './built-pages';
import { countWords } from './course';
import { coursesSearchPath, type LearnProject, learnProjectCoursePath, learnProjectIssuesPath } from './paths';

/*
 * The Learn card on a repository's and an organisation's page: one row for each thing Learn has about the project.
 * Pure, from the card's data and the page's project, so the card never shows a zero and has no row with nothing behind
 * it.
 */

/** A project course as the card names it. */
export type LearnEntityCourse = {
  slug: string;
  name: string;
  lessons: number;
  repo: string | null;
  org: string | null;
};

/** What Learn has about a project, as the API answers it: each number null where the card shows none. */
export type LearnEntityCard = {
  course: LearnEntityCourse | null;
  repoCourses: LearnEntityCourse[];
  fixes: number | null;
  openIssues: number | null;
};

/** The page the card is on: a repository by its `owner/name`, or an organisation by its login and its name. */
export type LearnEntity = { kind: 'repo'; repo: string } | { kind: 'org'; login: string; name: string };

/** A row's title in parts: a number is drawn in the numbers' type. */
export type EntityRowTitle = (string | number)[];

export type EntityRow = { id: string; title: EntityRowTitle; text: string; action: string; href: Route };

/** The card's title and the line under it. */
export function entityHeadOf(entity: LearnEntity): { title: string; line: string } {
  return entity.kind === 'repo'
    ? {
        title: 'Learn from this project',
        line: 'With GitRanks Learn: how this project works inside, and what its real fixes teach.',
      }
    : {
        title: 'Learn from this org’s projects',
        line: 'With GitRanks Learn: how this org’s projects work inside, and what their real fixes teach.',
      };
}

const lessonsOf = (count: number) => (count === 1 ? ' lesson' : ' lessons');

const projectOf = (entity: LearnEntity): LearnProject =>
  entity.kind === 'repo' ? { repo: entity.repo } : { org: entity.login };

/**
 * A course about one repository, as a row: none for a course that names no repository, which has no address, and none
 * while a project course has no page.
 */
const repoCourseRow = (course: LearnEntityCourse, text: string): EntityRow[] =>
  course.repo && LEARN_PROJECT_COURSE_PAGE_BUILT
    ? [
        {
          id: `course:${course.slug}`,
          title: ['A course about ', course.repo, ' · ', course.lessons, lessonsOf(course.lessons)],
          text,
          action: 'Open the course',
          href: learnProjectCoursePath({ repo: course.repo }),
        },
      ]
    : [];

/**
 * The card's rows, in order: the course about the project; for an organisation, the courses about its repositories
 * (one row each up to two, one row for all of them past that); the fixes to learn from; the open issues, which never
 * make a card alone. A row with nothing behind it is left out, and so is a row whose page is not built (a project
 * course's, the Issues page's); no row, no card.
 */
export function entityRowsOf(card: LearnEntityCard | null, entity: LearnEntity): EntityRow[] {
  if (!card) return [];
  const rows: EntityRow[] = [];
  const project = projectOf(entity);
  if (card.course && entity.kind === 'repo') {
    rows.push(
      ...repoCourseRow(
        card.course,
        'How it works inside, one small lesson at a time. Written by GitRanks, not by the project.',
      ),
    );
  }
  if (card.course && entity.kind === 'org' && LEARN_PROJECT_COURSE_PAGE_BUILT) {
    rows.push({
      id: `course:${card.course.slug}`,
      title: ['A course about ', entity.name, ' · ', card.course.lessons, lessonsOf(card.course.lessons)],
      text: 'How its projects work inside and fit together. Written by GitRanks, not by the org.',
      action: 'Open the course',
      href: learnProjectCoursePath(project),
    });
  }
  if (entity.kind === 'org' && card.repoCourses.length > 2) {
    rows.push({
      id: 'repo-courses',
      title: ['Courses about ', card.repoCourses.length, ' of its repositories'],
      text: `Each one shows how a repository of ${entity.name} works inside.`,
      action: 'See the courses',
      href: coursesSearchPath(entity.login),
    });
  } else if (entity.kind === 'org') {
    for (const course of card.repoCourses) rows.push(...repoCourseRow(course, `One of ${entity.name}’s repositories.`));
  }
  const fixes = card.fixes ?? 0;
  if (fixes > 0 && LEARN_ISSUES_PAGE_BUILT) {
    const where = entity.kind === 'repo' ? 'here' : `in ${entity.name}’s repositories`;
    rows.push({
      id: 'fixes',
      title: [fixes, fixes === 1 ? ' fix to learn from' : ' fixes to learn from'],
      text:
        fixes === 1
          ? `An issue fixed ${where} through GitRanks. It has a few questions on what went wrong and how the fix works.`
          : `Issues fixed ${where} through GitRanks. Each has a few questions on what went wrong and how the fix works.`,
      action: fixes === 1 ? 'See the fix' : 'See the fixes',
      href: learnProjectIssuesPath(project, { fixed: true }),
    });
  }
  const open = card.openIssues ?? 0;
  if (open > 0 && rows.length > 0 && LEARN_ISSUES_PAGE_BUILT) {
    rows.push({
      id: 'issues',
      title: [open, open === 1 ? ' open issue to fix' : ' open issues to fix'],
      text: 'Picked as ready for a fix with your own AI agent. Fix one, and learn from it.',
      action: open === 1 ? 'See the issue' : 'See the issues',
      href: learnProjectIssuesPath(project),
    });
  }
  return rows;
}

/** A number of a row's title as the card writes it: `1,234`. */
export const entityNumberOf = (value: number) => countWords(value);
