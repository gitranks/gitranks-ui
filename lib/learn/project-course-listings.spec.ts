import { beforeEach, describe, expect, it, vi } from 'vitest';

import { courseCards, djangoCourse, kubernetesCourse } from './__fixtures__/course';
import { courseCardVersionOf } from './course-share-card';
import { courseCardOf } from './home';
import { learnLandingMarkdownOf } from './landing';
import { learnCourseJsonLd, learnCourseMetadata, learnCoursesJsonLd } from './seo/course';
import { llmsTxtOf } from '@/lib/seo/llms-txt';
import { learnSitemapEntries } from '@/lib/sitemap/learn-sitemap';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://example.test';
});

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_URI', 'https://example.test');
});

describe('a project course in the lists', () => {
  it("reads a project course's card with its project, and drops one that names no project", () => {
    expect(courseCardOf({ ...djangoCourse })).toEqual({
      slug: 'django',
      name: 'Django, from the inside',
      kind: 'REPOSITORY',
      covers: 'How a request goes through Django',
      languages: ['python'],
      lessons: 2,
      numbers: { learners: null, goodShare: null },
      project: djangoCourse.project,
    });
    expect(courseCardOf({ ...kubernetesCourse, project: null })).toBeNull();
    expect(courseCardOf({ slug: 'go', name: 'Go', kind: 'LANGUAGE' })).not.toHaveProperty('project');
  });

  it("puts a project course in the sitemap at its project's address", () => {
    const urls = learnSitemapEntries({
      content: { courses: [{ slug: 'go' }, djangoCourse, kubernetesCourse], lessons: [] },
    }).map((entry) => entry.url);
    expect(urls).toEqual(
      expect.arrayContaining([
        'https://example.test/learn/courses/go',
        'https://example.test/learn/repos/django/django',
        'https://example.test/learn/orgs/kubernetes',
      ]),
    );
    expect(urls.some((url) => url.endsWith('/learn/courses/django'))).toBe(false);
  });

  it('lists project courses in llms.txt under their group, after the other courses', () => {
    const text = llmsTxtOf({
      contribute: false,
      learnCourses: [djangoCourse, { slug: 'go', name: 'Go', covers: 'Goroutines' }],
    });
    const go = text.indexOf('- [Go](https://example.test/learn/courses/go.md): Goroutines\n');
    const group = text.indexOf(
      '- Projects, from the inside: courses about one project, written by GitRanks from its docs and code\n',
    );
    const django = text.indexOf(
      '  - [Django, from the inside](https://example.test/learn/repos/django/django.md): How a request goes through Django\n',
    );
    expect(go).toBeGreaterThan(0);
    expect(group).toBeGreaterThan(go);
    expect(django).toBeGreaterThan(group);
    // No group without a project course.
    expect(llmsTxtOf({ contribute: false, learnCourses: courseCards })).not.toContain('Projects, from the inside');
  });

  it("lists project courses on the landing's copy with the group's line", () => {
    const text = learnLandingMarkdownOf([...courseCards, djangoCourse]);
    expect(text).toContain('### Projects, from the inside\n\nFor people who want to contribute to them.');
    expect(text).toContain('[Django, from the inside](https://example.test/learn/repos/django/django.md)');
    expect(learnLandingMarkdownOf(courseCards)).not.toContain('Projects, from the inside');
  });
});

describe("a project course's metadata and structured data", () => {
  it("names its project's address, its copy and its picture", () => {
    const metadata = learnCourseMetadata(djangoCourse);
    expect(metadata.alternates?.canonical).toBe('/learn/repos/django/django');
    expect(metadata.alternates?.types).toEqual({ 'text/markdown': '/learn/repos/django/django.md' });
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({
        url: expect.stringMatching(`/learn/repos/django/django/card.png\\?v=${courseCardVersionOf(djangoCourse)}$`),
      }),
    ]);
  });

  it('says what the course is about: the repository’s code, or the organisation', () => {
    const [repo] = learnCourseJsonLd(djangoCourse) as Record<string, unknown>[];
    expect(repo.url).toBe('https://example.test/learn/repos/django/django');
    expect(repo.about).toEqual({
      '@type': 'SoftwareSourceCode',
      name: 'Django',
      codeRepository: 'https://github.com/django/django',
    });
    const [org] = learnCourseJsonLd(kubernetesCourse) as Record<string, unknown>[];
    expect(org.about).toEqual({ '@type': 'Organization', name: 'Kubernetes', url: 'https://github.com/kubernetes' });
    const [list] = learnCoursesJsonLd([djangoCourse]) as { itemListElement: { url: string }[] }[];
    expect(list.itemListElement[0].url).toBe('https://example.test/learn/repos/django/django');
  });
});
