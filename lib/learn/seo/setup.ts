import type { Metadata } from 'next';

/** Set up Learn: only the person's own, so search engines never keep it. */
export const LEARN_SETUP_METADATA: Metadata = { title: 'Set up Learn', robots: { index: false, follow: false } };
