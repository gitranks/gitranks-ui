import { describe, expect, it } from 'vitest';

import { buildInsightSEO } from './seo';
import { InsightCategory, SegmentType } from '@/types/generated/graphql';

type Insight = Parameters<typeof buildInsightSEO>[0];

const segment = (text: string) => ({ type: SegmentType.Text, text, entityKey: null, display: null });

const insight = (overrides: Partial<Insight> = {}): Insight => ({
  id: 'post-1',
  category: InsightCategory.TopStarGainers,
  // 23:30 UTC: a server or browser east of UTC would already show the next day.
  createdAt: '2026-10-16T23:30:00.000Z',
  segments: [segment('octo gained 1,000 stars this week.')],
  entities: null,
  replies: [],
  socialPosts: null,
  ...overrides,
});

const articleOf = (seo: ReturnType<typeof buildInsightSEO>) => seo.jsonLd[0] as Record<string, unknown>;

describe('buildInsightSEO', () => {
  it('titles the page with the post and dates it in UTC', () => {
    const { metadata } = buildInsightSEO(insight());

    expect(metadata.title).toBe('octo gained 1,000 stars this week.');
    expect(metadata.description).toBe('Oct 16, 2026: octo gained 1,000 stars this week.');
    expect(metadata.alternates?.canonical).toBe('/insights/post-1');
    expect(metadata.openGraph).toMatchObject({ type: 'article', publishedTime: '2026-10-16T23:30:00.000Z' });
  });

  it('clips long posts to 60 characters without splitting an emoji', () => {
    const { metadata } = buildInsightSEO(insight({ segments: [segment(`${'x'.repeat(57)}🚀🚀🚀🚀🚀`)] }));

    expect(metadata.title).toBe(`${'x'.repeat(57)}🚀🚀…`);
  });

  it('falls back to the category for a post without text, without repeating the date', () => {
    const seo = buildInsightSEO(insight({ segments: [] }));

    expect(seo.metadata.title).toBe('Top Star Gainer · Oct 16, 2026');
    expect(seo.metadata.description).toBe('Top Star Gainer post from Oct 16, 2026.');
    expect(articleOf(seo)).not.toHaveProperty('articleBody');
  });

  it('describes the post as an Article by the site, with its replies as comments', () => {
    const article = articleOf(
      buildInsightSEO(
        insight({
          replies: [
            {
              createdAt: '2026-10-17T01:00:00.000Z',
              segments: [segment('A reply.')],
              entities: null,
              socialPosts: null,
            },
            { createdAt: '2026-10-17T02:00:00.000Z', segments: [], entities: null, socialPosts: null },
          ],
        }),
      ),
    );

    expect(article['@type']).toBe('Article');
    expect(article.author).toEqual({ '@id': '/#organization' });
    expect(article.commentCount).toBe(1);
    expect(article.comment).toEqual([
      {
        '@type': 'Comment',
        text: 'A reply.',
        datePublished: '2026-10-17T01:00:00.000Z',
        author: { '@id': '/#organization' },
      },
    ]);
  });
});
