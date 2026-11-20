import 'server-only';

import { cache } from 'react';

import { LearnRecordDocument } from '../learn.documents';
import type { LearnRecord } from '../learn.types';
import { githubLoginOf } from '../learn-path';
import { learnRecordOf } from '../learn-promo';
import type { LearnPublicProgress } from './public-progress';
import { LearnPublicProgressDocument } from './public-progress.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * A person's public record as the API answers it, anonymous: null without one (no public pass, Learn not open to them,
 * an account removed) or for a login that is not one. Throws when the API does not answer: a caller never shows a card
 * or a page of zeros for it. Once per request: the page and its metadata (the card's `v`) share it.
 */
export const loadPublicRecord = cache(async (login: string): Promise<LearnRecord | null> => {
  const asked = githubLoginOf(login);
  if (!asked) return null;
  const { learnRecord } = await graphqlDirect(LearnRecordDocument, { login: asked }, { source: 'ssr' });
  return learnRecordOf(learnRecord);
});

/** A page of a person's public lessons with their record; null without a record. Throws when the API does not answer. */
export const loadPublicProgress = cache(async (login: string, page: number): Promise<LearnPublicProgress | null> => {
  const asked = githubLoginOf(login);
  if (!asked) return null;
  const { learnPublicProgress } = await graphqlDirect(
    LearnPublicProgressDocument,
    { login: asked, page },
    { source: 'ssr' },
  );
  const record = learnRecordOf(learnPublicProgress?.record);
  return learnPublicProgress && record ? { ...learnPublicProgress, record } : null;
});
