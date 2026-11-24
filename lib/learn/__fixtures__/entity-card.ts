import type { LearnEntity, LearnEntityCard, LearnEntityCourse } from '../entity-card';

/** The Learn card's data in each case the boards draw, on a repository's page and an organisation's. */

const course = (slug: string, name: string, lessons: number, place: { repo?: string; org?: string }) =>
  ({ slug, name, lessons, repo: place.repo ?? null, org: place.org ?? null }) satisfies LearnEntityCourse;

export const repoEntity: LearnEntity = { kind: 'repo', repo: 'nebula/ui' };
export const orgEntity: LearnEntity = { kind: 'org', login: 'nebula', name: 'Nebula' };

const uiCourse = course('nebula-ui', 'nebula/ui', 38, { repo: 'nebula/ui' });

export const entityCards = {
  /** A course, fixes and open issues. */
  repoEverything: { course: uiCourse, repoCourses: [], fixes: 7, openIssues: 9 },
  /** No course (most repositories): fixes and open issues. */
  repoNoCourse: { course: null, repoCourses: [], fixes: 7, openIssues: 9 },
  /** One fix, and no issue open right now. */
  repoOneFix: { course: null, repoCourses: [], fixes: 1, openIssues: null },
  /** A new course: no fix made here yet, one open issue. */
  repoNewCourse: { course: uiCourse, repoCourses: [], fixes: null, openIssues: 1 },
  /** Open issues alone, which make no card. */
  repoIssuesOnly: { course: null, repoCourses: [], fixes: null, openIssues: 9 },
  /** The org's own course, one about a repository, fixes and open issues across its repositories. */
  orgEverything: {
    course: course('nebula', 'Nebula', 42, { org: 'nebula' }),
    repoCourses: [uiCourse],
    fixes: 12,
    openIssues: 31,
  },
  /** Courses about four of its repositories, none about the org. */
  orgManyRepos: {
    course: null,
    repoCourses: [
      uiCourse,
      course('nebula-core', 'nebula/core', 44, { repo: 'nebula/core' }),
      course('nebula-cli', 'nebula/cli', 21, { repo: 'nebula/cli' }),
      course('nebula-docs', 'nebula/docs', 12, { repo: 'nebula/docs' }),
    ],
    fixes: 12,
    openIssues: 31,
  },
} satisfies Record<string, LearnEntityCard>;
