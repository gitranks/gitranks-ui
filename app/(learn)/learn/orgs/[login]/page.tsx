import type { Metadata } from 'next';

import { ProjectCoursePage, projectCourseMetadata } from '@/components/learn/course/project-course-page';
import { learnProjectRouteOfSegments } from '@/lib/learn/paths';

/**
 * An organisation's course, at `/learn/orgs/<login>`: the same for everyone, read from the cached course by
 * its organisation (`project-course-page.tsx`). The proxy answers a missing or removed course first.
 */
export const instant = false;

type Params = PageProps<'/learn/orgs/[login]'>['params'];

const routeOf = async (params: Params) => learnProjectRouteOfSegments([(await params).login]);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return projectCourseMetadata(await routeOf(params));
}

export default async function OrgCoursePage({ params }: { params: Params }) {
  return <ProjectCoursePage route={await routeOf(params)} />;
}
