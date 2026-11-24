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
 * minutes under the fix's tags: null when the API answers none or does not know the read yet, and a failed read
 * throws, so no page keeps a passing outage as a 404, a redirect or the wrong kind of page. The person's marks are
 * read for them alone, in the browser through their route, and never kept: none on any failure.
 */

/** A build-time param no repository has: its page asks nothing. */
const NO_OWNER = '_';

/** The API's answers that mean the fix has no public part here: none such, or a read the API does not know yet. */
const NO_FIX: readonly string[] = ['NOT_AVAILABLE_YET', 'NOT_FOUND'];

/**
 * What "Learn from it" needs beside the timeline, kept for minutes under the fix's tag, the fixes' tag and its
 * timeline's (a hide expires it). Null for no such fix (or "not here yet"); anything else throws, and a cached
 * function keeps no thrown result. Decided inside: an error that leaves a kept read loses its message.
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
    if (NO_FIX.includes(contributeErrorOf(failure).error)) return null;
    throw failure;
  }
}

/**
 * The public part of a fix's page; null when the fix has none (or the API does not know the read yet). A failed read
 * throws: the page answers its error and keeps nothing, never a 404, a redirect or a page of the wrong kind.
 */
export async function loadFixPage(pr: PrRef): Promise<LearnFixPage | null> {
  const { owner, repo, number } = fixRefInputOf(pr);
  return fixPageCached(owner, repo, number);
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

/** The most pull request pages the sitemap lists (the API's newest 5,000), and so the most merged fixes it walks. */
export const FIX_SITEMAP_FIXES = 5000;

/** The most pages of merged fixes the sitemap walks: ten fixes a page, as many as the sitemap lists pages. */
export const FIX_SITEMAP_PAGES = FIX_SITEMAP_FIXES / 10;

/**
 * Every merged Learn fix as `owner/name#number`, lower case, for the sitemap, which lists them at "Learn from it",
 * their canonical: walked a page at a time, at most `FIX_SITEMAP_PAGES`. None for an API that does not know the read
 * yet (no fix has that view). Null when any page cannot be read: the sitemap cannot tell which address is canonical.
 */
export async function loadMergedFixKeys(): Promise<Set<string> | null> {
  const keys = new Set<string>();
  let after: string | null = null;
  for (let page = 0; page < FIX_SITEMAP_PAGES; page += 1) {
    let fixes: Awaited<ReturnType<typeof fixesCached>>;
    try {
      fixes = await fixesCached(null, null, null, after);
    } catch {
      return null;
    }
    if (!fixes) return page === 0 ? keys : null;
    for (const row of fixes.rows) keys.add(fixKeyOf({ nameWithOwner: row.repo, number: row.number }));
    if (!fixes.next || !fixes.rows.length) break;
    after = fixes.next;
  }
  return keys;
}
