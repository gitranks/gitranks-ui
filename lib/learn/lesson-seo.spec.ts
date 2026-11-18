import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://example.test';
});

const { lessonPage, PUBLIC_HEAD, result } = await import('./__fixtures__/shared');
const { LEARN_MAINTAINERS_METADATA, learnHomeMetadata, lessonJsonLd, lessonResultMetadata } = await import(
  './lesson-seo'
);

const LESSON_URL = 'https://example.test/learn/lessons/route-cache-miss-8f3k';

describe('Learn pages for search engines', () => {
  it('keeps a result page out of the index, follows its links, and points at its JSON', () => {
    const metadata = lessonResultMetadata({ kind: 'found', value: result({ login: 'octo-renamed' }) });
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.alternates).toEqual({
      canonical: '/learn/lessons/route-cache-miss-8f3k/passes/octo-renamed',
      types: { 'application/json': '/learn/lessons/route-cache-miss-8f3k/passes/octo-renamed.json' },
    });
  });

  it('describes a lesson as a LearningResource on its repository, with its steps', () => {
    const [lesson] = lessonJsonLd(lessonPage, { frontDoorOpen: false }) as [Record<string, unknown>];
    expect(lesson).toMatchObject({
      '@type': 'LearningResource',
      '@id': `${LESSON_URL}#lesson`,
      url: LESSON_URL,
      name: PUBLIC_HEAD.title,
      learningResourceType: 'Lesson',
      isAccessibleForFree: true,
      datePublished: PUBLIC_HEAD.publishedAt,
      about: {
        '@type': 'SoftwareSourceCode',
        name: 'driftwood-js/driftwood',
        codeRepository: 'https://github.com/driftwood-js/driftwood',
      },
      publisher: { '@id': 'https://example.test/#organization' },
    });
    expect(lesson.description).toContain('driftwood-js/driftwood issue #871');
    expect(lesson.author).toEqual({
      '@type': 'Person',
      name: 'octocat',
      url: 'https://example.test/profile/octocat',
      sameAs: 'https://github.com/octocat',
    });
    expect(lesson).not.toHaveProperty('teaches');
    expect(lesson.hasPart).toHaveLength(lessonPage.steps.length);
    expect((lesson.hasPart as { position: number }[])[0].position).toBe(1);
  });

  it('names Learn in the breadcrumbs only once its front door is open', () => {
    const crumbsOf = (frontDoorOpen: boolean) =>
      (lessonJsonLd(lessonPage, { frontDoorOpen })[1] as { itemListElement: { name: string; item: string }[] })
        .itemListElement;
    expect(crumbsOf(false).map((crumb) => crumb.item)).toEqual(['https://example.test/', LESSON_URL]);
    expect(crumbsOf(true).map((crumb) => crumb.name)).toEqual(['Home', 'Learn', PUBLIC_HEAD.title]);
  });

  it('gives the maintainers page its own canonical and preview', () => {
    expect(LEARN_MAINTAINERS_METADATA.alternates).toEqual({ canonical: '/learn/maintainers' });
    expect(LEARN_MAINTAINERS_METADATA.openGraph).toMatchObject({ title: 'GitRanks Learn for maintainers' });
    expect(LEARN_MAINTAINERS_METADATA.robots).toBeUndefined();
  });

  it('indexes the front door only once it is open to visitors', () => {
    expect(learnHomeMetadata(false).robots).toEqual({ index: false, follow: false });
    expect(learnHomeMetadata(true).robots).toBeUndefined();
    expect(learnHomeMetadata(true).alternates).toEqual({ canonical: '/learn' });
  });
});
