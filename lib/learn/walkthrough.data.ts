import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { learnFixTag } from './paths';
import {
  type FixMine,
  fixMineOf,
  fixRefInputOf,
  type Walkthrough,
  type WalkthroughAnswers,
  walkthroughAnswersOf,
  walkthroughOf,
} from './walkthrough';
import {
  LearnFixMineDocument,
  LearnMyWalkthroughAnswersDocument,
  LearnWalkthroughAnswersDocument,
  LearnWalkthroughDocument,
} from './walkthrough.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { contributeErrorOf } from '@/lib/workspace/errors';
import type { PrRef } from '@/lib/workspace/pr-feedback';

/*
 * A fix's walkthrough and a person's answers in two layers. The public reads are the same for everyone: read with no
 * session, kept for minutes under the fix's tag (which the sharing switch expires at once). The person's side is read
 * for them alone, in the browser through their route, and never kept.
 *
 * Every read answers null when the API answers none, does not know the read yet (an older API) or fails, so a page
 * says the walkthrough is not here instead of breaking.
 */

/** A failure the API means as "not here": a read or a field it does not know yet. */
const isNotHereYet = (failure: unknown) => contributeErrorOf(failure).error === 'NOT_AVAILABLE_YET';

/*
 * A kept read decides "not here yet" inside itself: an error that leaves a kept read reaches its caller with a new,
 * plain message in production. It answers null for it (kept for minutes, as the API answering none is), and throws
 * anything else, which nothing keeps.
 */

/** A fix's walkthrough with its key, kept for minutes; null when it is not up or not of its shape. */
async function walkthroughCached(owner: string, repo: string, number: number): Promise<Walkthrough | null> {
  'use cache';
  const pr = { nameWithOwner: `${owner}/${repo}`, number };
  cacheTag(learnFixTag(pr));
  cacheLife('minutes');
  try {
    const { learnWalkthrough } = await graphqlDirect(
      LearnWalkthroughDocument,
      { ref: fixRefInputOf(pr) },
      { source: 'ssr' },
    );
    return walkthroughOf(learnWalkthrough);
  } catch (failure) {
    if (!isNotHereYet(failure)) throw failure;
    return null;
  }
}

/** A person's answers, kept for minutes; null for a person with none, or a read not of their shape. */
async function answersCached(owner: string, repo: string, number: number, login: string) {
  'use cache';
  const pr = { nameWithOwner: `${owner}/${repo}`, number };
  cacheTag(learnFixTag(pr));
  cacheLife('minutes');
  try {
    const { learnWalkthroughAnswers } = await graphqlDirect(
      LearnWalkthroughAnswersDocument,
      { ref: fixRefInputOf(pr), login },
      { source: 'ssr' },
    );
    return walkthroughAnswersOf(learnWalkthroughAnswers);
  } catch (failure) {
    if (!isNotHereYet(failure)) throw failure;
    return null;
  }
}

/** The parts of a pull request as the kept reads take them: plain values, so the cache key is the same every time. */
const partsOf = ({ nameWithOwner, number }: PrRef) => {
  const { owner, repo } = fixRefInputOf({ nameWithOwner, number });
  return [owner, repo, number] as const;
};

/** A fix's public walkthrough; null when it is not here, for any reason. */
export async function loadWalkthrough(pr: PrRef): Promise<Walkthrough | null> {
  try {
    return await walkthroughCached(...partsOf(pr));
  } catch {
    return null;
  }
}

/** A person's answers as everyone reads them; null when there are none to read, for any reason. */
export async function loadWalkthroughAnswers(pr: PrRef, login: string): Promise<WalkthroughAnswers | null> {
  try {
    return await answersCached(...partsOf(pr), login);
  } catch {
    return null;
  }
}

const quietly = <T>(read: Promise<T>): Promise<T | null> => read.catch(() => null);

/** The person's side of a fix, and with `answers` the fixer's own answers. Never kept; each null on any failure. */
export async function loadFixMine(
  pr: PrRef,
  githubLogin: string,
  { answers = false }: { answers?: boolean } = {},
): Promise<{ mine: FixMine | null; answers: WalkthroughAnswers | null }> {
  const as = { source: 'ssr' as const, githubLogin };
  const ref = fixRefInputOf(pr);
  const [mine, own] = await Promise.all([
    quietly(graphqlDirect(LearnFixMineDocument, { ref }, as)),
    answers ? quietly(graphqlDirect(LearnMyWalkthroughAnswersDocument, { ref }, as)) : null,
  ]);
  return {
    mine: fixMineOf(mine?.learnFixMine),
    answers: own ? walkthroughAnswersOf(own.learnMyWalkthroughAnswers, { own: true }) : null,
  };
}
