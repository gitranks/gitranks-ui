import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { PrTimelineByAttemptDocument, PrTimelineDocument, PublicPrTimelinesDocument } from './pr-timeline.documents';
import type { PrTimeline, PublicPrTimeline } from './pr-timeline.types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type { PrRef } from '@/lib/workspace/pr-feedback';
import { prTimelinePath } from '@/lib/workspace/pr-timeline-path';

/** A build-time param no repository has: the build renders the not-found page without asking for data. */
export const NO_PR = { owner: '_', repo: '_', number: '1' } as const;

/** One PR's cache tag by its owner attempt's id (the API's answer to the contributor's switch names it). */
export const prTimelineAttemptTagOf = (attemptId: string) => `pr-timeline-attempt:${attemptId}`;

/** One PR's cache tag: the contributor's Hide expires it at once. */
export const prTimelineTagOf = ({ nameWithOwner, number }: PrRef) =>
  `pr-timeline:${nameWithOwner.toLowerCase()}#${number}`;

/**
 * The public page's read, signed out, the same for everyone it is shown to: kept two minutes fresh and five at most,
 * a page without its reviews one minute. Tagged per PR, by its address and its id. Null for anything that is not a
 * shown page (the proxy has already answered those; this is the race between its question and the render); a failed
 * read throws.
 */
export async function publicPrTimeline(pr: PrRef): Promise<PrTimeline | null> {
  'use cache';
  cacheTag(prTimelineTagOf(pr));
  const [owner, repo] = pr.nameWithOwner.split('/');
  if (owner === NO_PR.owner) {
    cacheLife({ stale: 60, revalidate: 60, expire: 60 });
    return null;
  }
  // A failed read throws: a cached function keeps no thrown result, so a passing outage is never kept as a 404.
  const answer = await graphqlDirect(PrTimelineDocument, { owner, repo, number: pr.number }, { source: 'ssr' });
  const timeline = answer?.contributePrTimeline?.timeline ?? null;
  // Also by the PR's own id: the contributor's Hide expires it whatever address the page was opened at.
  if (timeline) cacheTag(prTimelineAttemptTagOf(timeline.attemptId));
  cacheLife(
    !timeline || timeline.partial
      ? { stale: 60, revalidate: 60, expire: 60 }
      : { stale: 60, revalidate: 120, expire: 300 },
  );
  return timeline;
}

/**
 * The shown pages for the sitemap, newest first. Kept an hour once it lists any; an empty list or a
 * failed read (null) is kept minutes.
 */
export async function readPublicPrTimelines(): Promise<PublicPrTimeline[] | null> {
  'use cache';
  const answer = await graphqlDirect(PublicPrTimelinesDocument, undefined, { source: 'ssr' }).catch(() => null);
  // An empty list (nothing shown yet) is asked again within minutes: opening reaches the sitemap soon.
  if (answer?.publicPrTimelines.length) cacheLife('hours');
  else cacheLife('minutes');
  return answer?.publicPrTimelines ?? null;
}

const ATTEMPT_ID = /^[a-f\d]{24}$/;

/**
 * A PR's public timeline address by its footer's id, for the links into it (the maintainers strip, the sent screens):
 * only when it is shown; null otherwise or on a failed read. Asked signed out, kept minutes.
 */
export async function publicTimelinePathOf(attemptId: string | null | undefined): Promise<string | null> {
  'use cache';
  cacheLife('minutes');
  if (!attemptId || !ATTEMPT_ID.test(attemptId)) return null;
  try {
    const { contributePrTimelineByAttempt } = await graphqlDirect(
      PrTimelineByAttemptDocument,
      { id: attemptId },
      { source: 'ssr' },
    );
    const page = contributePrTimelineByAttempt?.timeline;
    return page ? prTimelinePath(page) : null;
  } catch {
    return null;
  }
}
