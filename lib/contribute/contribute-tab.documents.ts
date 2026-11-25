import { parse } from 'graphql';

import type DocumentNode from '@/types/typed-document-node';

/** The person's pull requests through GitRanks, both products: how many were merged, and in how many projects. */
export type ContributeHomeTotals = { merged: number; reposHelped: number };

/** Contribute home's "Merged" box: the totals of every pull request sent through GitRanks. */
export const ContributeTabTotalsDocument = parse(
  'query ContributeTabTotals { contributeContributions(first: 1) { totals { merged reposHelped } } }',
) as DocumentNode<{ contributeContributions: { totals: Partial<ContributeHomeTotals> | null } | null }>;
