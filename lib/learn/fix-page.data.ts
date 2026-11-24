import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { type FixMarks, fixKeyOf, fixMarksOf, type LearnFixPage, learnFixOf } from './fix-page';
import { LearnFixMarksDocument, LearnFixPageDocument } from './fix-page.documents';
import { fixesCached } from './issues.data';
import { LEARN_FIXES_TAG, learnFixTag } from './paths';
import { fixRefInputOf } from './walkthrough';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { contributeErrorOf } from '@/lib/workspace/errors';
import type { MaskedListReads } from '@/lib/workspace/masked-issue';
import { loadMaskedListReads } from '@/lib/workspace/masked-issue.data';
import type { PrRef } from '@/lib/workspace/pr-feedback';
import { prTimelineTagOf } from '@/lib/workspace/pr-timeline-path';

/*
 * The public page of a fix in two layers. The public read is the same for everyone: read with no session, kept for
 * minutes under the fix's tags. The person's marks are read for them alone, in the browser through their route, and
 * never kept. Every read answers null when the API answers none, does not know the read yet or fails, so the page
 * shows the timeline alone instead of breaking.
 */

/** A build-time param no repository has: its page asks nothing. */
const NO_OWNER = '_';

/**
 * What "Learn from it" needs beside the timeline, kept for minutes under the fix's tag, the fixes' tag and its
 * timeline's (a hide expires it). "Not here yet" is decided inside: an error that leaves a kept read loses its message.
 */
async function fixPageCached(owner: string, repo: string, number: number): Promise<LearnFixPage | null> {
  'use cache';
  const pr = { nameWithOwner: `${owner}/${repo}`, number };
  cacheTag(learnFixTag(pr), LEARN_FIXES_TAG, prTimelineTagOf(pr));
  cacheLife('minutes');
  if (owner === NO_OWNER) return null;
  try {
    const { learnFix } = await graphqlDirect(LearnFixPageDocument, { ref: { owner, repo, number } }, { source: 'ssr' });
    return learnFixOf(learnFix);
  } catch (failure) {
    if (contributeErrorOf(failure).error !== 'NOT_AVAILABLE_YET') throw failure;
    return null;
  }
}

/** The public part of a fix's page; null when it is not here, for any reason. */
export async function loadFixPage(pr: PrRef): Promise<LearnFixPage | null> {
  const { owner, repo, number } = fixRefInputOf(pr);
  try {
    return await fixPageCached(owner, repo, number);
  } catch {
    return null;
  }
}

/** The person's side of a fix's page: their marks, and what the masked rows of their similar issues need. */
export type FixMarksAnswer = { marks: FixMarks | null; reads: MaskedListReads | null };

export const NO_FIX_MARKS: FixMarksAnswer = { marks: null, reads: null };

/** The person's marks on a fix with their similar issues. Never kept; null parts on any failure. */
export async function loadFixMarks(pr: PrRef, githubLogin: string): Promise<FixMarksAnswer> {
  const read = await graphqlDirect(
    LearnFixMarksDocument,
    { ref: fixRefInputOf(pr) },
    { source: 'ssr', githubLogin },
  ).catch(() => null);
  const marks = fixMarksOf(read?.learnFixMine);
  if (!marks) return NO_FIX_MARKS;
  const reads = marks.similar.length ? await loadMaskedListReads().catch(() => null) : null;
  return { marks, reads };
}

/** The most pages of merged fixes the sitemap walks: ten fixes a page. */
export const FIX_SITEMAP_PAGES = 50;

/**
 * Every merged Learn fix as `owner/name#number`, lower case, for the sitemap, which lists them at "Learn from it":
 * walked a page at a time, at most `FIX_SITEMAP_PAGES`. Null when the first page cannot be read; a later page that
 * fails ends the walk with what it has.
 */
export async function loadMergedFixKeys(): Promise<Set<string> | null> {
  const keys = new Set<string>();
  let after: string | null = null;
  for (let page = 0; page < FIX_SITEMAP_PAGES; page += 1) {
    const fixes: Awaited<ReturnType<typeof fixesCached>> = await fixesCached(null, null, null, after).catch(() => null);
    if (!fixes) return page === 0 ? null : keys;
    for (const row of fixes.rows) keys.add(fixKeyOf({ nameWithOwner: row.repo, number: row.number }));
    if (!fixes.next || !fixes.rows.length) break;
    after = fixes.next;
  }
  return keys;
}
