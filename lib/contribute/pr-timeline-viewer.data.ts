import 'server-only';

import { cache } from 'react';

import { viewerEmail, viewerLogin } from './contribute.data';
import type { PrRef } from './pr-feedback';
import { PrTimelineDocument } from './pr-timeline.documents';
import type { PrTimeline } from './pr-timeline.types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * Before the pages are public: the read as the signed-in viewer (by login and email, as the API's list holds them),
 * never cached. Null when the API shows them none.
 */
export const viewerPrTimeline = cache(async (pr: PrRef): Promise<PrTimeline | null> => {
  const githubLogin = await viewerLogin();
  if (!githubLogin) return null;
  const accountEmail = await viewerEmail();
  const [owner, repo] = pr.nameWithOwner.split('/');
  const { contributePrTimeline } = await graphqlDirect(
    PrTimelineDocument,
    { owner, repo, number: pr.number },
    { source: 'ssr', githubLogin, ...(accountEmail ? { accountEmail } : {}) },
  );
  return contributePrTimeline?.timeline ?? null;
});
