import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import {
  PrTimelineByAttemptDocument,
  PrTimelineDocument,
  PrTimelineHelpedDocument,
  PublicPrTimelinesDocument,
} from './pr-timeline.documents';
import type { PrTimeline, PrTimelineHelped, PublicPrTimeline } from './pr-timeline.types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { GITHUB_LOGIN } from '@/lib/workspace/paths';
import type { PrRef } from '@/lib/workspace/pr-feedback';
import { prTimelineAttemptTagOf, prTimelinePath, prTimelineTagOf } from '@/lib/workspace/pr-timeline-path';

/** A build-time param no repository has: the build renders the not-found page without asking for data. */
export const NO_PR = { owner: '_', repo: '_', number: '1' } as const;

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

/** Logins only, as GitHub writes them: anything else in the answer is left out. */
const LOGIN = new RegExp(`^${GITHUB_LOGIN}$`);

/**
 * Who said the pull request helped, by name, as the page shows them: kept with the page's own read under its tag, a
 * minute fresh. Null when none is named, when the API does not know these fields yet, and on any failure, so the
 * page shows the count alone: nothing that fails here leaves the cache as an error.
 */
export async function publicPrTimelineHelped(pr: PrRef): Promise<PrTimelineHelped | null> {
  'use cache';
  cacheTag(prTimelineTagOf(pr));
  cacheLife({ stale: 60, revalidate: 60, expire: 120 });
  const [owner, repo] = pr.nameWithOwner.split('/');
  if (owner === NO_PR.owner) return null;
  try {
    const answer = await graphqlDirect(PrTimelineHelpedDocument, { owner, repo, number: pr.number }, { source: 'ssr' });
    const read = answer?.contributePrTimeline?.timeline;
    if (!read || !Array.isArray(read.helpedBy)) return null;
    const helpedBy = read.helpedBy.filter((login) => typeof login === 'string' && LOGIN.test(login)).slice(0, 5);
    if (!helpedBy.length) return null;
    const named = typeof read.helpedNamed === 'number' ? Math.max(read.helpedNamed, helpedBy.length) : helpedBy.length;
    return { helpedBy, helpedNamed: named };
  } catch {
    return null;
  }
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
