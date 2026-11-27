import type { Route } from 'next';

import { BUILD_PROJECTS_PATH, buildProjectPath, buildTestPath } from './paths';
import type { BuildDoors, BuildMine, BuildProjectCard } from './types';

/*
 * The doors into Build on Learn's and Contribute's pages: a line under a course's numbers, a row in "Go further" when
 * a course is finished, and a line at the end of an issue's page. Each is read from what a project already names, its
 * Learn courses. A door with nothing behind it is not shown.
 */

/** How many projects the course's line names before "and N more". */
export const COURSE_LINE_NAMES = 3;

/** Where the person stands in a project, as the course's line says it: a tick, the step, or the test left. */
export type BuildDoorPlace = { kind: 'built' } | { kind: 'step'; number: number; of: number } | { kind: 'test_left' };

/** One project the course's line names: the thing it builds, its page, and the person's place in it. */
export type CourseLineItem = { slug: string; thing: string; href: Route; place: BuildDoorPlace | null };

/** The course's line: "Build it yourself:" then up to three things, then how many more (none: 0). */
export type CourseLine = { items: CourseLineItem[]; more: number; moreHref: Route };

/** The person's builds of one project, the one touched last first. */
const buildsOf = (doors: BuildDoors, slug: string): BuildMine[] =>
  doors.builds
    .filter((build) => build.project.slug === slug)
    .sort((a, b) => Date.parse(b.lastStepAt) - Date.parse(a.lastStepAt));

/** The person's place in a project: built if any build of it is; else the build touched last. */
function placeOf(doors: BuildDoors, slug: string): BuildDoorPlace | null {
  const builds = buildsOf(doors, slug);
  if (builds.some((build) => build.state.kind === 'built')) return { kind: 'built' };
  const last = builds[0];
  if (!last) return null;
  if (last.state.kind === 'test_left') return { kind: 'test_left' };
  if (last.state.kind === 'in_progress') return { kind: 'step', number: last.state.step.number, of: last.state.of };
  return null;
}

/** The line under a course's numbers; null when no project names the course. */
export function courseLineOf(doors: BuildDoors | null): CourseLine | null {
  if (!doors?.projects.length) return null;
  const items = doors.projects.slice(0, COURSE_LINE_NAMES).map((project) => ({
    slug: project.slug,
    thing: project.thing,
    href: buildProjectPath(project.slug),
    place: placeOf(doors, project.slug),
  }));
  return { items, more: Math.max(0, doors.projects.length - COURSE_LINE_NAMES), moreHref: BUILD_PROJECTS_PATH };
}

/** What follows a thing on the course's line: " (step 4 of 18)", " (the test is left)"; none built or not started. */
export const placeWordsOf = (place: BuildDoorPlace | null): string | null => {
  if (place?.kind === 'step') return ` (step ${place.number} of ${place.of})`;
  if (place?.kind === 'test_left') return ' (the test is left)';
  return null;
};

/** A thing without its article, as "Your …" names it: "a key-value database" is "key-value database". */
const bareThing = (thing: string) => thing.replace(/^(?:an?|the)\s+/i, '');

/** One row of "Go further": its name, one small line under it, and where it leads. */
export type FurtherRow = { name: string; line: string; href: Route };

/**
 * Build's row in "Go further", which follows the person: their build of one of the course's projects (step, or the test
 * left, which it leads to), else the first project they have not started. None when they built every one, or no
 * project names the course.
 */
export function furtherProjectRowOf(doors: BuildDoors | null): FurtherRow | null {
  if (!doors?.projects.length) return null;
  const named = new Set(doors.projects.map((project) => project.slug));
  const going = [...doors.builds]
    .filter((build) => named.has(build.project.slug) && build.state.kind !== 'built')
    .filter((build) => !buildsOf(doors, build.project.slug).some((other) => other.state.kind === 'built'))
    .sort((a, b) => Date.parse(b.lastStepAt) - Date.parse(a.lastStepAt))[0];
  if (going) {
    const name = `Your ${bareThing(going.project.thing)}`;
    if (going.state.kind === 'test_left') {
      return {
        name,
        line: 'Your build · the test is left',
        href: buildTestPath(going.project.slug, 'end', going.language),
      };
    }
    if (going.state.kind === 'in_progress') {
      return {
        name,
        line: `Your build · step ${going.state.step.number} of ${going.state.of}`,
        href: buildProjectPath(going.project.slug),
      };
    }
  }
  const fresh = doors.projects.find((project) => buildsOf(doors, project.slug).length === 0);
  return fresh ? { name: fresh.name, line: projectLineOf(fresh), href: buildProjectPath(fresh.slug) } : null;
}

/** "A project · 14 steps". */
const projectLineOf = (project: BuildProjectCard) =>
  `A project · ${project.baseSteps} ${project.baseSteps === 1 ? 'step' : 'steps'}`;

/** The project an issue's line offers: the first of the course's projects the person has not built. */
function issueProjectOf(doors: BuildDoors): BuildProjectCard | null {
  return (
    doors.projects.find((project) => !buildsOf(doors, project.slug).some((build) => build.state.kind === 'built')) ??
    null
  );
}

/**
 * The line at the end of an issue's page, for someone who feels not ready: the issue's lesson when it is not learned,
 * a project of its course when one is left to build. None when there is neither.
 */
export type IssueBuildLine =
  | { kind: 'both'; lesson: { title: string; href: Route }; project: { thing: string; href: Route } }
  | { kind: 'project'; project: { thing: string; href: Route } }
  | { kind: 'lesson'; lesson: { title: string; href: Route } };

export function issueBuildLineOf(
  lesson: { title: string; href?: Route | null; learned: boolean },
  doors: BuildDoors | null,
): IssueBuildLine | null {
  if (!doors) return null;
  const found = issueProjectOf(doors);
  const project = found ? { thing: found.thing, href: buildProjectPath(found.slug) } : null;
  const learn = !lesson.learned && lesson.href ? { title: lesson.title, href: lesson.href } : null;
  if (learn && project) return { kind: 'both', lesson: learn, project };
  if (project && lesson.learned) return { kind: 'project', project };
  if (learn) return { kind: 'lesson', lesson: learn };
  return null;
}

/** "64 lessons": the next course's line in "Go further". */
export const nextCourseLineOf = (lessons: number) => `Next course · ${lessons} ${lessons === 1 ? 'lesson' : 'lessons'}`;

/** "Real issues · 2 open". */
export const issuesLineOf = (open: number) => `Real issues · ${open} open`;

/** Where the job row leads, and its words. */
export const JOB_ROW = {
  name: 'Looking for a job?',
  line: 'Roles that match what you know',
  href: 'https://roleford.com',
} as const;
