import 'server-only';

import { parse } from 'graphql';
import { cache } from 'react';

import { type ContributeMergedPrRead, type LandingProofPr, landingProofPrsOf } from './landing-proof';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type DocumentNode from '@/types/typed-document-node';

/** How long the landing waits for its proof: a slower answer draws the page without it, as a failed one does. */
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
 * leaves the card and the rows out. Read once per request.
 */
export const loadLandingProof = cache(async (): Promise<LandingProofPr[] | null> => {
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
