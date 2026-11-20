import { parse } from 'graphql';

import type { ContributeHostedLevel, ContributeSideTotals } from '@/lib/workspace/contribute.types';
import type DocumentNode from '@/types/typed-document-node';

/** Contribute's pull requests by state, for the tab's four numbers. */
export const ContributeTabTotalsDocument = parse(
  'query ContributeTabTotals { contributeContributions(first: 1) { totals { byMode { fix { open merged closed reposHelped } } } } }',
) as DocumentNode<{
  contributeContributions: { totals: { byMode: { fix: ContributeSideTotals } | null } } | null;
}>;

/** How much the hosted agent does by itself: read on its own, so an older API leaves the rest. */
export const ContributeTabStateDocument = parse(
  'query ContributeTabState { contribute { contributor { settings { hostedLevel } } } }',
) as DocumentNode<{
  contribute: { contributor: { settings: { hostedLevel: ContributeHostedLevel | null } | null } | null } | null;
}>;
