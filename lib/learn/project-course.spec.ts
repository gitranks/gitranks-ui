import { beforeEach, describe, expect, it, vi } from 'vitest';

import { djangoCourse, kubernetesCourse } from './__fixtures__/course';
import {
  courseCardHrefOf,
  courseHrefOf,
  courseMarkdownHrefOf,
  learnProjectCourseGonePath,
  learnProjectCourseMarkdownRoute,
  learnProjectCourseMarkdownRouteOf,
  learnProjectCourseRouteOf,
  learnProjectRouteOfSegments,
  orgLoginOf,
  projectOfRoute,
  repoNameOf,
} from './paths';
import {
  learnCourseProjectOf,
  possessiveOf,
  projectAuthorLineOf,
  projectCoversLineOf,
  projectDayWordsOf,
  projectGithubLabelOf,
  projectGitranksLabelOf,
  projectGitranksPathOf,
  projectLanguageOf,
  projectMaintainerLineOf,
  projectOpenIssuesWordsOf,
  quoteFileWordsOf,
  quoteLineOf,
  quoteUrlOf,
} from './project-course';

// The project course's own page, built or not: each case below sets it.
const built = vi.hoisted(() => ({ projectCourse: true }));
vi.mock('@/lib/learn/built-pages', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  get LEARN_PROJECT_COURSE_PAGE_BUILT() {
    return built.projectCourse;
  },
}));

beforeEach(() => {
  built.projectCourse = true;
});

const django = djangoCourse.project ?? null;
const kubernetes = kubernetesCourse.project ?? null;

describe("a project course's project", () => {
  it('reads the project the API sends, and nothing for a course without one', () => {
    expect(learnCourseProjectOf({ ...django })).toEqual(django);
    expect(learnCourseProjectOf({ name: 'Kubernetes', repo: null, org: 'kubernetes' })).toEqual({
      name: 'Kubernetes',
      repo: null,
      org: 'kubernetes',
      language: '',
      githubUrl: 'https://github.com/kubernetes',
      onGitranks: false,
      covers: [],
      checkedAt: '',
    });
    // A repository's course names no organisation, even when the API sends one.
    expect(learnCourseProjectOf({ name: 'Django', repo: 'django/django', org: 'django' })?.org).toBeNull();
    for (const value of [null, undefined, 'django', [], {}, { name: 'Django' }, { repo: 'django/django' }]) {
      expect(learnCourseProjectOf(value), JSON.stringify(value)).toBeNull();
    }
  });

  it('names the project, its language and its days in words', () => {
    expect(possessiveOf('Django')).toBe('Django’s');
    expect(possessiveOf('Kubernetes')).toBe('Kubernetes’');
    expect(projectDayWordsOf('2026-11-12')).toBe('12 Nov 2026');
    expect(projectDayWordsOf('2026-11-12T23:30:00.000Z')).toBe('12 Nov 2026');
    for (const day of ['', 'soon', '2026-02-30', '12/11/2026']) expect(projectDayWordsOf(day), day).toBeNull();
    expect(projectLanguageOf({ language: 'python' })).toBe('Python');
    expect(projectLanguageOf({ language: '' })).toBeNull();
  });

  it('writes the line of facts: GitHub, GitRanks and the open issues', () => {
    if (!django || !kubernetes) throw new Error('the fixtures name their projects');
    expect(projectGithubLabelOf(django)).toBe('django/django on GitHub');
    expect(projectGithubLabelOf(kubernetes)).toBe('kubernetes on GitHub');
    expect(projectGitranksPathOf(django)).toBe('/repo/django/django');
    expect(projectGitranksPathOf(kubernetes)).toBe('/org/kubernetes');
    expect(projectGitranksLabelOf(django)).toBe('Django on GitRanks');
    expect(projectOpenIssuesWordsOf(1)).toBe('1 open issue to fix');
    expect(projectOpenIssuesWordsOf(9)).toBe('9 open issues to fix');
    expect(projectOpenIssuesWordsOf(4200)).toBe('1,000+ open issues to fix');
    for (const count of [0, null, undefined, Number.NaN]) expect(projectOpenIssuesWordsOf(count)).toBeNull();
  });

  it('says who wrote the course, what an organisation’s course covers, and asks its maintainers', () => {
    if (!django || !kubernetes) throw new Error('the fixtures name their projects');
    expect(projectAuthorLineOf(django)).toBe(
      'Written by GitRanks from the project’s docs and code. Not an official Django course. Last checked against the code on 12 Nov 2026.',
    );
    expect(projectAuthorLineOf(kubernetes)).toBe(
      'Written by GitRanks from the project’s docs and code. Not an official Kubernetes course.',
    );
    expect(projectCoversLineOf(kubernetes)).toBe('It covers 3 repositories: kubernetes, kubectl and website.');
    expect(projectCoversLineOf({ ...kubernetes, covers: ['ui', 'core'] })).toBe(
      'It covers 2 repositories: ui and core.',
    );
    expect(projectCoversLineOf({ ...kubernetes, covers: ['ui'] })).toBe('It covers the repository ui.');
    expect(projectCoversLineOf({ ...kubernetes, covers: [] })).toBeNull();
    expect(projectCoversLineOf(django)).toBeNull();
    expect(projectMaintainerLineOf(django)).toBe(
      'Do you maintain Django? Tell us what to correct, or ask us to take this course down',
    );
  });

  it('quotes the project’s code with its file, its lines and the exact version it was read at', () => {
    const source = {
      repo: 'django/django',
      path: 'django/core/handlers/base.py',
      commit: 'abc123',
      firstLine: 138,
      lastLine: 144,
      at: '2026-11-12',
    };
    expect(quoteUrlOf(source)).toBe(
      'https://github.com/django/django/blob/abc123/django/core/handlers/base.py#L138-L144',
    );
    expect(quoteUrlOf({ ...source, path: 'docs/a b.txt', lastLine: 138 })).toBe(
      'https://github.com/django/django/blob/abc123/docs/a%20b.txt#L138',
    );
    expect(quoteFileWordsOf(source)).toBe('django/core/handlers/base.py, lines 138 to 144');
    expect(quoteFileWordsOf({ ...source, lastLine: 138 })).toBe('django/core/handlers/base.py, line 138');
    expect(quoteLineOf(source, 'Django')).toBe(
      'Django’s own code, as it was on 12 Nov 2026. The link opens this exact version on GitHub, so it still matches the lesson after the project changes the file.',
    );
    expect(quoteLineOf({ ...source, at: '' }, null)).toBe(
      'django/django’s own code. The link opens this exact version on GitHub, so it still matches the lesson after the project changes the file.',
    );
  });
});

describe("a project course's addresses", () => {
  it('links a project course at its project’s address, and any other course at its slug’s', () => {
    expect(courseHrefOf(djangoCourse)).toBe('/learn/repos/django/django');
    expect(courseHrefOf(kubernetesCourse)).toBe('/learn/orgs/kubernetes');
    expect(courseHrefOf({ slug: 'algorithms' })).toBe('/learn/courses/algorithms');
    expect(courseHrefOf({ slug: 'odd', project: { repo: 'not-a-repo', org: null } })).toBe('/learn/courses/odd');
    expect(courseMarkdownHrefOf(djangoCourse)).toBe('/learn/repos/django/django.md');
    expect(courseMarkdownHrefOf(kubernetesCourse)).toBe('/learn/orgs/kubernetes.md');
    expect(courseCardHrefOf(djangoCourse)).toBe('/learn/repos/django/django/card.png');
    expect(courseCardHrefOf({ slug: 'go' })).toBe('/learn/courses/go/card.png');
  });

  it('links every course at its slug’s address while the project’s page is not built', () => {
    built.projectCourse = false;
    expect(courseHrefOf(djangoCourse)).toBe('/learn/courses/django');
    expect(courseMarkdownHrefOf(kubernetesCourse)).toBe('/learn/courses/kubernetes.md');
  });

  it('shows a removed or paused project course under `_gone`, which no project can be named', () => {
    expect(learnProjectCourseGonePath({ repo: 'django/django' })).toBe('/learn/repos/_gone/django/django');
    expect(learnProjectCourseGonePath({ org: 'kubernetes' })).toBe('/learn/orgs/_gone/kubernetes');
    expect(learnProjectCourseRouteOf('/learn/repos/_gone/django')).toBe('invalid');
    expect(learnProjectCourseRouteOf('/learn/orgs/_gone')).toBe('invalid');
    expect(learnProjectCourseRouteOf('/learn/repos/_gone/django/django')).toBeNull();
    expect(learnProjectCourseRouteOf('/learn/orgs/_gone/kubernetes')).toBeNull();
  });

  it('reads the project a page’s address names, for the proxy’s gate', () => {
    expect(learnProjectCourseRouteOf('/learn/repos/django/django')).toEqual({
      kind: 'repository',
      slug: 'django/django',
    });
    expect(learnProjectCourseRouteOf('/learn/repos/Octo-Labs/scroll.guard/')).toEqual({
      kind: 'repository',
      slug: 'Octo-Labs/scroll.guard',
    });
    expect(learnProjectCourseRouteOf('/learn/orgs/kubernetes')).toEqual({ kind: 'org', slug: 'kubernetes' });
    for (const path of ['/learn/repos/-x/y', '/learn/repos/x/..', '/learn/orgs/a_b', '/learn/repos/x/%E0%A4%A']) {
      expect(learnProjectCourseRouteOf(path), path).toBe('invalid');
    }
    for (const path of ['/learn/repos', '/learn/repos/django', '/learn/repos/django/django/card.png', '/learn/x']) {
      expect(learnProjectCourseRouteOf(path), path).toBeNull();
    }
  });

  it('reads a page’s segments in lower case, as the API names projects', () => {
    expect(learnProjectRouteOfSegments(['Django', 'Django'])).toEqual({ kind: 'repository', slug: 'django/django' });
    expect(learnProjectRouteOfSegments(['Kubernetes'])).toEqual({ kind: 'org', slug: 'kubernetes' });
    expect(learnProjectRouteOfSegments(['_gone'])).toBeNull();
    expect(learnProjectRouteOfSegments(['a', 'b', 'c'])).toBeNull();
    expect(projectOfRoute({ kind: 'repository', slug: 'django/django' })).toEqual({ repo: 'django/django' });
    expect(projectOfRoute({ kind: 'org', slug: 'kubernetes' })).toEqual({ org: 'kubernetes' });
  });

  it('checks a repository’s and an organisation’s names as GitHub allows them', () => {
    expect(repoNameOf('django/django')).toBe('django/django');
    expect(orgLoginOf('kubernetes')).toBe('kubernetes');
    for (const value of ['django', 'a/b/c', '-a/b', 'a/..', '']) expect(repoNameOf(value), value).toBeNull();
    for (const value of ['a/b', '-a', 'a_b', '']) expect(orgLoginOf(value), value).toBeNull();
  });

  it('answers a project course’s Markdown copy from its route', () => {
    expect(learnProjectCourseMarkdownRoute({ repo: 'django/django' })).toBe(
      '/api/learn/projects/repos/django/django/course.md',
    );
    expect(learnProjectCourseMarkdownRoute({ org: 'kubernetes' })).toBe(
      '/api/learn/projects/orgs/kubernetes/course.md',
    );
    expect(learnProjectCourseMarkdownRouteOf('/learn/repos/django/django.md')).toBe(
      '/api/learn/projects/repos/django/django/course.md',
    );
    expect(learnProjectCourseMarkdownRouteOf('/learn/orgs/kubernetes.md')).toBe(
      '/api/learn/projects/orgs/kubernetes/course.md',
    );
    for (const path of ['/learn/repos/django.md', '/learn/orgs/a_b.md', '/learn/repos/django/django', '/x.md']) {
      expect(learnProjectCourseMarkdownRouteOf(path), path).toBeNull();
    }
  });
});
