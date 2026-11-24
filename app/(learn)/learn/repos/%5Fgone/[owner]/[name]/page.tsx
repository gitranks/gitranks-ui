import type { Metadata } from 'next';

import { ProjectCourseGonePage, projectCourseGoneMetadata } from '@/components/learn/course/project-course-gone';
import { learnProjectRouteOfSegments } from '@/lib/learn/paths';

/**
 * `/learn/repos/_gone/<owner>/<name>`, where the proxy sends a repository's course that was removed (with a 410) or
 * paused (with a 503): `lib/learn/course-gate.ts`. `_gone` is no GitHub login, so no project is ever under it.
 */
export const instant = false;

type Params = PageProps<'/learn/repos/_gone/[owner]/[name]'>['params'];

const routeOf = async (params: Params) => {
  const { owner, name } = await params;
  return learnProjectRouteOfSegments([owner, name]);
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return projectCourseGoneMetadata(await routeOf(params));
}

export default async function RepoCourseGonePage({ params }: { params: Params }) {
  return <ProjectCourseGonePage route={await routeOf(params)} />;
}
