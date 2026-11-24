'use server';

import type { Route } from 'next';
import { revalidateTag } from 'next/cache';

import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { learnFixTag } from '@/lib/learn/paths';
import { fixMineOf, fixRefInputOf, type WalkthroughAnswers, walkthroughAnswersOf } from '@/lib/learn/walkthrough';
import {
  LearnFixMineDocument,
  PassLearnWalkthroughDocument,
  ShareLearnWalkthroughAnswersDocument,
} from '@/lib/learn/walkthrough.documents';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import { type ContributeActionResult, contributeErrorOf } from '@/lib/workspace/errors';
import { issuePageHrefOf } from '@/lib/workspace/masked-issue';
import { type PrRef, parsePrLink } from '@/lib/workspace/pr-feedback';

/*
 * A fix's walkthrough writes two things, always as the session's user and never one named in the arguments: another
 * person's walkthrough passed, and the fixer's choice to share their answers.
 */

/** A pull request from the browser: only one a fix's address can name. */
function prOf(value: unknown): PrRef | null {
  const ref = value && typeof value === 'object' ? (value as Partial<PrRef>) : null;
  if (typeof ref?.nameWithOwner !== 'string' || !Number.isInteger(ref.number)) return null;
  const pr = parsePrLink(`${ref.nameWithOwner}#${ref.number}`);
  return pr && pr.number === ref.number ? pr : null;
}

/**
 * The person finished another person's walkthrough: the pass is stored once per version for a signed-in person
 * (nothing for a visitor, nothing for the fixer), and the answer says where "Finish the walkthrough" leads them: the
 * first similar issue of their own list, best match first. `next` is null with none, signed out, or on any failure;
 * the page then leads to the issues like this one that everyone sees.
 */
export async function finishWalkthroughAction(pr: unknown, version: unknown): Promise<{ next: Route | null }> {
  const ref = prOf(pr);
  const githubLogin = await viewerLogin();
  if (!ref || !githubLogin || !Number.isInteger(version) || (version as number) < 1) return { next: null };
  const as = { source: 'client' as const, githubLogin };
  const input = fixRefInputOf(ref);
  const [, mine] = await Promise.all([
    graphqlDirect(PassLearnWalkthroughDocument, { ref: input, version: version as number }, as).catch(() => null),
    graphqlDirect(LearnFixMineDocument, { ref: input }, as).catch(() => null),
  ]);
  const similar = fixMineOf(mine?.learnFixMine)?.similar;
  return { next: similar ? issuePageHrefOf(similar, 'learn') : null };
}

/**
 * The fixer shares their answers, or keeps them private: their answers as they are now. The fix's public pages are
 * expired at once, so everyone reads the new choice. Null data for anyone but the fixer.
 */
export async function shareAnswersAction(
  pr: unknown,
  shared: unknown,
): Promise<ContributeActionResult<WalkthroughAnswers | null>> {
  const ref = prOf(pr);
  if (!ref || typeof shared !== 'boolean') return { ok: false, error: 'INVALID', message: 'That was not accepted.' };
  const githubLogin = await viewerLogin();
  if (!githubLogin) return { ok: false, error: 'SIGNED_OUT' };
  try {
    const { shareLearnWalkthroughAnswers } = await graphqlDirect(
      ShareLearnWalkthroughAnswersDocument,
      { ref: fixRefInputOf(ref), shared },
      { source: 'client', githubLogin },
    );
    revalidateTag(learnFixTag(ref), { expire: 0 });
    return { ok: true, data: walkthroughAnswersOf(shareLearnWalkthroughAnswers, { own: true }) };
  } catch (error) {
    return { ok: false, ...contributeErrorOf(error) };
  }
}
