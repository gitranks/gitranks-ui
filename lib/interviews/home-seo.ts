import type { Metadata } from 'next';

import { INTERVIEWS_OPEN_TO_EVERYONE } from './interviews-parts';
import { INTERVIEWS_HOME_MARKDOWN_PATH, INTERVIEWS_HOME_PATH } from './paths';
import { INTERVIEWS_CARD_HEADLINE, interviewsCardUrlOf } from './share-card';
import { withInterviewsPreview } from './share-seo';
import type { InterviewsHome } from './types';
import { pageMetadata } from '@/lib/seo/page-metadata';

/*
 * What Interviews home tells search engines and link previews: the title and description of its share picture's
 * post. While Interviews is open only to some people, the page is not indexed.
 */

/** Interviews home's title, as a posted link shows it. */
export const INTERVIEWS_HOME_TITLE = 'Interview plans for engineers · GitRanks';
/** Interviews home's description. */
export const INTERVIEWS_HOME_DESCRIPTION =
  'A plan follows the real rounds of one company’s interview, in order, with short lessons and small projects for each round.';

/** Interviews home's metadata: `noindex` until Interviews is open to everyone. */
export const INTERVIEWS_HOME_METADATA: Metadata = {
  ...pageMetadata({
    title: { absolute: INTERVIEWS_HOME_TITLE },
    description: INTERVIEWS_HOME_DESCRIPTION,
    path: INTERVIEWS_HOME_PATH,
  }),
  ...(INTERVIEWS_OPEN_TO_EVERYONE ? {} : { robots: { index: false, follow: false } }),
};

/**
 * Interviews home's metadata with its share picture (the top five's logos, from the home read) and its Markdown copy.
 * `noindex` until Interviews is open to everyone, as above.
 */
export const interviewsHomeMetadataOf = (home: Pick<InterviewsHome, 'top'>): Metadata =>
  withInterviewsPreview(INTERVIEWS_HOME_METADATA, {
    picture: interviewsCardUrlOf(home),
    alt: INTERVIEWS_CARD_HEADLINE,
    markdown: INTERVIEWS_HOME_MARKDOWN_PATH,
  });
