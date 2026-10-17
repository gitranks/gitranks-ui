import type { Metadata } from 'next';

import { formatPostDate } from '@/components/insight/format-insight-date';
import { InsightCategoryTitle } from '@/components/insight/insight-category-title';
import { clipText } from '@/lib/seo/clip-text';
import { ORGANIZATION_ID } from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { absoluteUrl } from '@/lib/seo/site';
import type { InsightQuery } from '@/types/generated/graphql';

type Insight = NonNullable<InsightQuery['insight']>;

/** The site writes every post and reply. */
const SITE_ORGANIZATION = { '@id': ORGANIZATION_ID };

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
  const url = absoluteUrl(path);
  const publishedAt = new Date(insight.createdAt);
  const date = formatPostDate(publishedAt);
  const category = InsightCategoryTitle[insight.category];
  const text = toPlainText(insight);
  const title = text ? clipText(text, 60) : `${category} · ${date}`;
  const description = clipText(text ? `${date}: ${text}` : `${category} post from ${date}.`, 158);
  const replies = insight.replies
    .map((reply) => ({ text: toPlainText(reply), createdAt: new Date(reply.createdAt) }))
    .filter((reply) => reply.text);

  // An Article, not a SocialMediaPosting: the site authors these posts, and posting markup is
  // meant for user-generated content.
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    url,
    mainEntityOfPage: url,
    headline: title,
    ...(text && { articleBody: text }),
    datePublished: publishedAt.toISOString(),
    author: SITE_ORGANIZATION,
    publisher: SITE_ORGANIZATION,
    commentCount: replies.length,
    comment: replies.map((reply) => ({
      '@type': 'Comment',
      text: reply.text,
      datePublished: reply.createdAt.toISOString(),
      author: SITE_ORGANIZATION,
    })),
  };

  return {
    metadata: pageMetadata({
      title,
      description,
      path,
      openGraphType: 'article',
      publishedTime: publishedAt.toISOString(),
    }),
    jsonLd: [article],
  };
}
