import type { Metadata } from 'next';

/**
 * The metadata of every page a link opens: never indexed, and no address passed on to another site (the response's
 * own headers say the same; these are the page's copy of it).
 */
export const linkPageMetadata = (title: string): Metadata => ({
  title,
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
});
