import type { Metadata } from 'next';

/** My progress: only the person's own, so search engines never keep it. */
export const LEARN_MY_PROGRESS_METADATA: Metadata = { title: 'Your progress', robots: { index: false, follow: false } };
