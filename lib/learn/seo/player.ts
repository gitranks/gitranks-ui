import type { Metadata } from 'next';

/*
 * The player's pages: each is only the person's own, so search engines never keep one.
 */

const NO_INDEX = { index: false, follow: false } as const;

/** The daily review's page. */
export const LEARN_REVIEW_METADATA: Metadata = { title: 'Your review', robots: NO_INDEX };
/** A course's check, or "What you know": the course's name when it is known. */
export const learnCheckMetadata = (course: { name: string } | null, known: boolean): Metadata => ({
  title: course ? (known ? 'What you know in ' : 'The check of ') + course.name : 'Page not found',
  robots: NO_INDEX,
});
