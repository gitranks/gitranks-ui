import { parse } from 'graphql';

import type { ContributeRunsFilter, ContributeRunsPage } from './runs';
import type DocumentNode from '@/types/typed-document-node';

const RUN = `attemptId nameWithOwner number title kind followUpOf { attemptId number } followUps runner model effort
  agent { name model } queuedBy state outcome endReason endDetail noGoCategory pullRequest { number url }
  costUsd goNoGoUsd workUsd createdAt startedAt finishedAt`;

/** A page of the Runs page: the runs, the cursor to the next, and the totals, chips, repos and days of the filter. */
export const ContributeRunsDocument =
  parse(`query ContributeRuns($filter: ContributeRunsFilter, $after: String, $first: Int) {
  contributeRuns(filter: $filter, after: $after, first: $first) {
    items { ${RUN} }
    nextCursor
    totals { runs started costUsd prs merged closed noGo noGoCostUsd noGoByCategory { category count } }
    outcomeCounts { outcome count }
    repos
    days { day runs costUsd prs }
  }
}`) as DocumentNode<
    { contributeRuns: ContributeRunsPage | null },
    { filter?: ContributeRunsFilter; after?: string; first?: number }
  >;
