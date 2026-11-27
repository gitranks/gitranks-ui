import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { BuildCourseProjectsDocument, BuildLessonCourseDocument } from './doors.documents';
import { BUILD_PROJECTS_TAG, isBuildSlug } from './paths';
import { loadBuildProjectsMine } from './projects.data';
import type { BuildDoors, BuildProjectCard } from './types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * The doors into Build: read from what a project already names, its Learn courses. The public parts are cached and
 * never throw (a failed read is null, kept for minutes, and the page stays as today); the person's builds are read for
 * the session's own person.
 */

/**
 * The projects that name a course, in our order: [] when none does, null when the read failed. Hours when there are
 * some; minutes for none or a failure.
 */
export async function loadBuildCourseProjects(course: string): Promise<BuildProjectCard[] | null> {
  'use cache';
  cacheTag(BUILD_PROJECTS_TAG);
  let projects: BuildProjectCard[] | null = null;
  try {
    const { buildCourseProjects } = await graphqlDirect(BuildCourseProjectsDocument, { course }, { source: 'ssr' });
    projects = Array.isArray(buildCourseProjects) ? buildCourseProjects : null;
  } catch {
    projects = null;
  }
  if (projects?.length) {
    cacheLife('hours');
    return projects;
  }
  cacheLife('minutes');
  return projects;
}

/** The course a lesson belongs to; null for an unknown lesson or a failed read (kept for minutes then). */
export async function loadBuildLessonCourse(lesson: string): Promise<string | null> {
  'use cache';
  let course: string | null = null;
  try {
    const { learnLesson } = await graphqlDirect(BuildLessonCourseDocument, { slug: lesson }, { source: 'ssr' });
    course = learnLesson?.course.slug ?? null;
  } catch {
    course = null;
  }
  if (course) cacheLife('hours');
  else cacheLife('minutes');
  return course;
}

/**
 * The doors for one course, or for the course of an issue's lesson: its projects and the person's builds of them.
 * Null when Build is not open to the person (their builds are refused), and when either read fails: the page then
 * stays as today, rather than drawing "no project names the course".
 */
export async function loadBuildDoors(
  githubLogin: string,
  of: { course?: string | null; lesson?: string | null },
): Promise<BuildDoors | null> {
  const course = of.course ?? (of.lesson && isBuildSlug(of.lesson) ? await loadBuildLessonCourse(of.lesson) : null);
  if (!course || !isBuildSlug(course)) return null;
  const [projects, builds] = await Promise.all([loadBuildCourseProjects(course), loadBuildProjectsMine(githubLogin)]);
  if (!projects || !builds) return null;
  const named = new Set(projects.map((project) => project.slug));
  return { projects, builds: builds.filter((build) => named.has(build.project.slug)) };
}
