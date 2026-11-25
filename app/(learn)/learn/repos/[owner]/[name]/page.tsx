import type { Metadata } from 'next';

import { ProjectCoursePage, projectCourseMetadata } from '@/components/learn/course/project-course-page';
import { learnProjectRouteOfSegments } from '@/lib/learn/paths';

/**
 * A repository's course, at `/learn/repos/<owner>/<name>`: the same for everyone, read from the cached
 * course by its repository (`project-course-page.tsx`). The proxy answers a missing or removed course first.
 */
export const instant = false;

type Params = PageProps<'/learn/repos/[owner]/[name]'>['params'];

const routeOf = async (params: Params) => {
  const { owner, name } = await params;
  return learnProjectRouteOfSegments([owner, name]);
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  return projectCourseMetadata(await routeOf(params));
}

export default async function RepoCoursePage({ params }: { params: Params }) {
  return <ProjectCoursePage route={await routeOf(params)} />;
}
