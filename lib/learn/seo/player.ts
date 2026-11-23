import type { Metadata } from 'next';

/*
 * The player's pages: each is only the person's own, so search engines never keep one.
 */

const NO_INDEX = { index: false, follow: false } as const;

/** The daily review's page. */
export const LEARN_REVIEW_METADATA: Metadata = { title: 'Your review', robots: NO_INDEX };
