import { format } from 'date-fns';
import type { Metadata } from 'next';

import { InsightCategoryTitle } from '@/components/insight/insight-category-title';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { absoluteUrl, SITE_NAME, SITE_URL } from '@/lib/seo/site';
import type { InsightQuery } from '@/types/generated/graphql';

type Insight = NonNullable<InsightQuery['insight']>;

const clip = (t: string, max: number) => {
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const i = cut.lastIndexOf(' ');
  return `${i > max / 2 ? cut.slice(0, i) : cut}…`;
};

/** The post as plain text, the way `InsightText` renders it. */
const toPlainText = (post: Pick<Insight, 'segments'>) =>
  post.segments
    .map((segment) => segment?.text ?? '')
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

/** Metadata for a post page and the JSON-LD to render on it. */
export function buildInsightSEO(insight: Insight): { metadata: Metadata; jsonLd: object[] } {
  const path = `/insights/${encodeURIComponent(insight.id)}`;
  const publishedAt = new Date(insight.createdAt);
  const text = toPlainText(insight);
  const title = text
    ? clip(text, 70)
    : `${InsightCategoryTitle[insight.category]} · ${format(publishedAt, 'MMM d, yyyy')}`;
  const description = clip(`${format(publishedAt, 'MMM d, yyyy')}: ${text || title}`, 158);

  const posting = {
    '@context': 'https://schema.org',
    '@type': 'SocialMediaPosting',
    url: absoluteUrl(path),
    headline: title,
    text,
    datePublished: publishedAt.toISOString(),
    author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    commentCount: insight.replies.length,
    comment: insight.replies.map((reply) => ({
      '@type': 'Comment',
      text: toPlainText(reply),
      datePublished: new Date(reply.createdAt).toISOString(),
      author: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    })),
  };

  return {
    metadata: pageMetadata({ title, description, path, publishedTime: publishedAt.toISOString() }),
    jsonLd: [posting],
  };
}
