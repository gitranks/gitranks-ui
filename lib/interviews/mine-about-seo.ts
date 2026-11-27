import type { Metadata } from 'next';

import { ABOUT_LEAD } from './about';
import { INTERVIEWS_OPEN_TO_EVERYONE } from './interviews-parts';
import { INTERVIEWS_ABOUT_PATH, INTERVIEWS_MINE_PATH } from './paths';
import { pageMetadata } from '@/lib/seo/page-metadata';

/*
 * What My interviews and How it works tell search engines and link previews. My interviews is a person's own and
 * never indexed. How it works is the same for everyone, and indexed only once Interviews is open to everyone.
 */

const NOINDEX = { index: false, follow: false } as const;

/** My interviews. */
export const INTERVIEWS_MINE_METADATA: Metadata = {
  ...pageMetadata({
    title: 'My interviews',
    description: 'Every interview plan you started, with the round you are on and what comes next.',
    path: INTERVIEWS_MINE_PATH,
  }),
  robots: NOINDEX,
};

/** How it works. */
export const INTERVIEWS_ABOUT_METADATA: Metadata = {
  ...pageMetadata({
    title: { absolute: 'How GitRanks Interviews works' },
    description: ABOUT_LEAD,
    path: INTERVIEWS_ABOUT_PATH,
  }),
  ...(INTERVIEWS_OPEN_TO_EVERYONE ? {} : { robots: NOINDEX }),
};
