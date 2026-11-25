import 'server-only';

import { parse } from 'graphql';
import { connection } from 'next/server';
import { cache } from 'react';

import { type ContributeMergedPrRead, type LandingProofPr, landingProofPrsOf } from './landing-proof';
import { contributeLedgerOpen } from './ledger-gate';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type DocumentNode from '@/types/typed-document-node';

/** How long the landing waits for its proof and for the ledger's answer: a slower one draws the page without it. */
export const LANDING_PROOF_TIMEOUT_MS = 1_500;

/**
 * The newest pull requests with a public page that a person reviewed, newest merge first; with none merged, the newest
 * open one (`open: true`). The same for everyone, so it is asked with no viewer.
 */
const NewestMergedDocument = parse(`query ContributeNewestMerged {
  contributeNewestMerged(open: true) {
    nameWithOwner number url title openedAt mergedAt contributorLogin agent
    issue { number url title kind language }
    change { files added removed }
  }
}`) as DocumentNode<{ contributeNewestMerged: ContributeMergedPrRead[] | null }, Record<string, never>>;

/**
 * The landing's proof, or null when the read failed or took longer than `LANDING_PROOF_TIMEOUT_MS`: the landing then
 * leaves the card and the rows out. Read once per request. It is started before the page reads the session, and a
 * signed request reads the clock, so `connection()` keeps it out of any prerender first.
 */
export const loadLandingProof = cache(async (): Promise<LandingProofPr[] | null> => {
  await connection();
  try {
    const { contributeNewestMerged } = await graphqlDirect(NewestMergedDocument, undefined, {
      source: 'ssr',
      signal: AbortSignal.timeout(LANDING_PROOF_TIMEOUT_MS),
    });
    return landingProofPrsOf(contributeNewestMerged);
  } catch {
    return null;
  }
});

/**
 * Whether "Merged through GitRanks" links the public ledger: asked beside the proof, with the same time limit. A slow
 * or failed answer is closed (the heading then stands alone). Kept out of any prerender, as the proof is: it reads the
 * clock.
 */
export const loadLandingLedgerOpen = cache(async (): Promise<boolean> => {
  await connection();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<false>((resolve) => {
    timer = setTimeout(() => resolve(false), LANDING_PROOF_TIMEOUT_MS);
  });
  try {
    return await Promise.race([contributeLedgerOpen(Date.now()).catch(() => false), late]);
  } finally {
    clearTimeout(timer);
  }
});
