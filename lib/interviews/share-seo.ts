import type { Metadata } from 'next';

import { SOCIAL_CARD_SIZE } from '@/badge/v3/links';
import { absoluteUrl } from '@/lib/seo/site';

/** A page's share picture (its versioned address) and the picture's words; its Markdown copy, when it has one. */
type InterviewsPreview = { picture: string; alt: string; markdown?: string };

/**
 * A page's metadata with its share picture in the link preview, at 1200 by 630, and its Markdown copy as an
 * alternate, as Learn's pages carry theirs.
 */
export function withInterviewsPreview(metadata: Metadata, { picture, alt, markdown }: InterviewsPreview): Metadata {
  const images = [{ url: absoluteUrl(picture), ...SOCIAL_CARD_SIZE, alt }];
  return {
    ...metadata,
    ...(markdown ? { alternates: { ...metadata.alternates, types: { 'text/markdown': markdown } } } : {}),
    openGraph: { ...metadata.openGraph, images },
    twitter: { ...metadata.twitter, card: 'summary_large_image', images },
  };
}
