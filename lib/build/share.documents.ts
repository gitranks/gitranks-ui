import { doc } from './build.documents';
import type { BuildCourseFacts } from './project-courses';
import type { BuildSharedRow } from './share-card';

/*
 * The two public reads Build's share parts ask of the API besides Build's own: a person's built projects as their
 * public Skills page lists them (a person's build is shared only when it is there), and each Learn course's line and
 * lessons, for the courses a project names.
 */

/** A person's public Built rows; `skillsPage` is null when their page is not public. */
export const BuildSharedBuiltDocument = doc<
  { skillsPage: { built?: BuildSharedRow[] | null } | null },
  { login: string }
>(
  'query BuildSharedBuilt($login: String!) { skillsPage(login: $login) { built { project thing languages steps builtAt gold } } }',
);

/** Every live Learn course's line and lessons. */
export const BuildCourseFactsDocument = doc<{ learnCourses: BuildCourseFacts[] }>(
  'query BuildCourseFacts { learnCourses { slug covers lessons } }',
);
