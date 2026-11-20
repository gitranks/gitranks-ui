import type { Metadata } from 'next';

import type { LearnRecord } from '../learn.types';
import { publicProgressPath } from '../learn-path';
import { learnCardUrlOf, publicProgressDescriptionOf } from './public-progress';
import { SOCIAL_CARD_SIZE } from '@/badge/v3/links';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { absoluteUrl } from '@/lib/seo/site';

/** It names a person: search engines do not keep it, and follow its links. */
const NO_INDEX_FOLLOW = { index: false, follow: true } as const;

/**
 * A person's public progress page's title, description and link preview: the card, under the address its numbers name
 * (`v`, from the same record read the card route makes), so a posted link shows today's card. Without a record (the
 * page's 404, or a read that failed): only kept out of search engines.
 */
export function publicProgressMetadataOf(login: string, record: LearnRecord | null): Metadata {
  if (!record) return { title: 'GitRanks Learn', robots: NO_INDEX_FOLLOW };
  const description = publicProgressDescriptionOf(record);
  return {
    ...pageMetadata({
      title: { absolute: `${login} on GitRanks Learn` },
      description,
      path: publicProgressPath(login),
      images: [{ url: absoluteUrl(learnCardUrlOf(login, record)), ...SOCIAL_CARD_SIZE, alt: description }],
    }),
    robots: NO_INDEX_FOLLOW,
  };
}
