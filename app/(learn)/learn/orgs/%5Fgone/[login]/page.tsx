import type { Metadata } from 'next';

import { ProjectCourseGonePage, projectCourseGoneMetadata } from '@/components/learn/course/project-course-gone';
import { learnProjectRouteOfSegments } from '@/lib/learn/paths';

/**
 * `/learn/orgs/_gone/<login>`, where the proxy sends an organisation's course that was removed (with a 410) or paused
 * (with a 503): `lib/learn/course-gate.ts`. `_gone` is no GitHub login, so no project is ever under it.
 */
export const instant = false;

type Params = PageProps<'/learn/orgs/_gone/[login]'>['params'];

const routeOf = async (params: Params) => learnProjectRouteOfSegments([(await params).login]);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return projectCourseGoneMetadata(await routeOf(params));
}

export default async function OrgCourseGonePage({ params }: { params: Params }) {
  return <ProjectCourseGonePage route={await routeOf(params)} />;
}
