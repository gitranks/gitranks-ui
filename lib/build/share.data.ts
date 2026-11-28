import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { BUILD_PROJECTS_TAG } from './paths';
import type { BuildCourseFacts } from './project-courses';
import { BuildCourseFactsDocument, BuildSharedBuiltDocument } from './share.documents';
import type { BuildSharedRow } from './share-card';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/*
 * The public reads behind a shared build and a project's courses. Each is cached and never throws: a failed read says
 * so, and is kept for minutes.
 */

/**
 * The tag of a person's public Skills reads: hiding or showing their page expires it, so a hidden page's builds stop
 * being shared at once.
 */
const skillsTagOf = (login: string) => `skills:${login.toLowerCase()}`;

/** A read's answer, or `failed` when the API could not be read. */
export type SharedRead<T> = { value: T; failed: boolean };

/**
 * A person's built projects as their public Skills page lists them: none when the page is not public. Kept fifteen
 * minutes, as the Skills page is.
 */
export async function loadSharedBuilt(login: string): Promise<SharedRead<BuildSharedRow[]>> {
  'use cache';
  cacheTag(skillsTagOf(login));
  try {
    const { skillsPage } = await graphqlDirect(BuildSharedBuiltDocument, { login }, { source: 'ssr' });
    cacheLife({ stale: 300, revalidate: 900, expire: 86_400 });
    return { value: skillsPage?.built ?? [], failed: false };
  } catch {
    cacheLife('minutes');
    return { value: [], failed: true };
  }
}

/**
 * The tag of the list of Learn courses, so a change to a course's lessons reaches a project's page too. Written here,
 * as Build imports nothing of Learn's.
 */
const LEARN_COURSES_TAG = 'learn:courses';

/**
 * Every live Learn course's line and lessons, for the courses a project names; none on a failed read. Kept for hours,
 * an empty list (no course live, or a deploy in between) for minutes.
 */
export async function loadBuildCourseFacts(): Promise<BuildCourseFacts[]> {
  'use cache';
  cacheTag(BUILD_PROJECTS_TAG, LEARN_COURSES_TAG);
  try {
    const { learnCourses } = await graphqlDirect(BuildCourseFactsDocument, {}, { source: 'ssr' });
    if (learnCourses.length) cacheLife('hours');
    else cacheLife('minutes');
    return learnCourses;
  } catch {
    cacheLife('minutes');
    return [];
  }
}
