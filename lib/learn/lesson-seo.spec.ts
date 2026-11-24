import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://example.test';
});

const { lessonPage, PUBLIC_HEAD, result } = await import('./__fixtures__/shared');
const {
  LEARN_ABOUT_METADATA,
  LEARN_EARLIER_METADATA,
  LEARN_MAINTAINERS_METADATA,
  lessonJsonLd,
  lessonPageMetadata,
  lessonResultMetadata,
} = await import('./lesson-seo');

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
    const [lesson] = lessonJsonLd(lessonPage) as [Record<string, unknown>];
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

  it('names Learn in the breadcrumbs', () => {
    const crumbs = (lessonJsonLd(lessonPage)[1] as { itemListElement: { name: string; item: string }[] })
      .itemListElement;
    expect(crumbs.map((crumb) => crumb.name)).toEqual(['Home', 'Learn', PUBLIC_HEAD.title]);
    expect(crumbs.map((crumb) => crumb.item)).toEqual([
      'https://example.test/',
      'https://example.test/learn',
      LESSON_URL,
    ]);
  });

  it('gives the maintainers page its own canonical and preview', () => {
    expect(LEARN_MAINTAINERS_METADATA.alternates).toEqual({ canonical: '/learn/maintainers' });
    expect(LEARN_MAINTAINERS_METADATA.openGraph).toMatchObject({ title: 'GitRanks Learn for maintainers' });
    expect(LEARN_MAINTAINERS_METADATA.robots).toBeUndefined();
  });

  it('never indexes How Learn works, whose canonical is the landing, nor the earlier page', () => {
    expect(LEARN_ABOUT_METADATA.alternates).toEqual({ canonical: '/learn' });
    expect(LEARN_ABOUT_METADATA.robots).toEqual({ index: false, follow: false });
    expect(LEARN_EARLIER_METADATA).toEqual({
      title: 'Fix a real issue with your agent',
      robots: { index: false, follow: false },
    });
  });

  it('invites the reader to sign in and take a lesson', () => {
    const description = String(lessonPageMetadata({ kind: 'found', value: lessonPage }).description);
    // Clipped to 158 characters: the invitation starts after the steps' count.
    expect(description).toMatch(/question each\. Read it/);
    const [lesson] = lessonJsonLd(lessonPage) as [{ description: string }];
    expect(lesson.description).toBe(description);
  });
});
