import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import type { PrRef } from './pr-feedback';
import { PrTimelineDocument } from './pr-timeline.documents';
import type { PrTimeline } from './pr-timeline.types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** A build-time param no repository has: the build renders the not-found page without asking for data. */
export const NO_PR = { owner: '_', repo: '_', number: '1' } as const;

/** One PR's cache tag: the contributor's Hide expires it at once. */
export const prTimelineTagOf = ({ nameWithOwner, number }: PrRef) =>
  `pr-timeline:${nameWithOwner.toLowerCase()}#${number}`;

/**
 * The public page's read, signed out, the same for everyone it is shown to: kept two minutes fresh and five at most,
 * a page without its reviews one minute. Tagged per PR. Null for anything that is not a shown page (the proxy has
 * already answered those; this is the race between its question and the render).
 */
export async function publicPrTimeline(pr: PrRef): Promise<PrTimeline | null> {
  'use cache';
  cacheTag(prTimelineTagOf(pr));
  const [owner, repo] = pr.nameWithOwner.split('/');
  if (owner === NO_PR.owner) {
    cacheLife({ stale: 60, revalidate: 60, expire: 60 });
    return null;
  }
  const answer = await graphqlDirect(PrTimelineDocument, { owner, repo, number: pr.number }, { source: 'ssr' }).catch(
    () => null,
  );
  const timeline = answer?.contributePrTimeline?.timeline ?? null;
  cacheLife(
    !timeline || timeline.partial
      ? { stale: 60, revalidate: 60, expire: 60 }
      : { stale: 60, revalidate: 120, expire: 300 },
  );
  return timeline;
}
