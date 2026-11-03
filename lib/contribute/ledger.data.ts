import 'server-only';

import { cache } from 'react';

import { viewerLogin } from './contribute.data';
import { ContributeLedgerDocument } from './ledger.documents';
import type { ContributeLedger } from './ledger.types';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/**
 * The Contribute ledger (ledger design 2026-11-03 §6), or null when the API hides it from this visitor: everyone while
 * `CONTRIBUTE_LEDGER` is unset, anyone off its list while it lists people. Asked as the signed-in viewer when there is
 * one (the list needs the login), signed out otherwise. Read once per request: the page and its metadata share it.
 */
export const loadLedger = cache(async (): Promise<ContributeLedger | null> => {
  const githubLogin = await viewerLogin();
  const { contributeLedger } = await graphqlDirect(ContributeLedgerDocument, undefined, {
    source: 'ssr',
    ...(githubLogin ? { githubLogin } : {}),
  });
  return contributeLedger;
});
