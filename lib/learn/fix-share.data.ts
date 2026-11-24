import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { LearnFixCardDocument } from './fix-share.documents';
import type { LearnFixCard } from './fix-share-card';
import { learnFixTag } from './paths';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type { PrRef } from '@/lib/workspace/pr-feedback';
import { prTimelineTagOf } from '@/lib/workspace/pr-timeline-path';

/** A fix as its picture reads it: null when its page is not public; `failed` when the API could not be read. */
export type FixCardRead = { fix: LearnFixCard | null; failed: boolean };

/**
 * One fix, read signed out, the same for everyone: kept two minutes fresh and five at most, under the fix's tag and
 * its page's (the contributor's Hide expires that one). A failed read is kept a minute and says it failed.
 */
export async function loadFixCard(pr: PrRef): Promise<FixCardRead> {
  'use cache';
  cacheTag(learnFixTag(pr), prTimelineTagOf(pr));
  const [owner, repo] = pr.nameWithOwner.split('/');
  try {
    const { learnFix } = await graphqlDirect(
      LearnFixCardDocument,
      { ref: { owner, repo, number: pr.number } },
      { source: 'ssr' },
    );
    cacheLife({ stale: 60, revalidate: 120, expire: 300 });
    return { fix: learnFix ?? null, failed: false };
  } catch {
    cacheLife({ stale: 60, revalidate: 60, expire: 60 });
    return { fix: null, failed: true };
  }
}
