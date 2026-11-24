import type { Metadata } from 'next';

import { LEARN_PATH } from './learn-path';
import { pageMetadata } from '@/lib/seo/page-metadata';

const NO_INDEX = { index: false, follow: false } as const;

/**
 * `/learn/about`, How Learn works: the landing as a learner reads it. Its canonical address is `/learn`, and it is never
 * indexed, so search engines see one landing.
 */
export const LEARN_ABOUT_METADATA: Metadata = {
  ...pageMetadata({
    title: 'How Learn works',
    description:
      'Short lessons on algorithms, databases, design patterns, system design and seven languages, then a real open-source issue to use them on.',
    path: LEARN_PATH,
  }),
  robots: NO_INDEX,
};
