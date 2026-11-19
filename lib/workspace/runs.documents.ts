import { parse } from 'graphql';

import type { ContributeRunsFilter, ContributeRunsPage } from './runs';
import type DocumentNode from '@/types/typed-document-node';

const RUN = `attemptId nameWithOwner number title kind followUpOf { attemptId number } followUps runner model effort
  agent { name model } queuedBy state outcome endReason endDetail noGoCategory pullRequest { number url }
  costUsd goNoGoUsd workUsd createdAt startedAt finishedAt mode`;

/**
 * A numbered page of the user's runs (`offset` runs skipped), with the totals, chips, repos and days of the filter. The
 * totals carry the learner's lessons.
 */
export const ContributeRunsDocument =
  parse(`query ContributeRuns($filter: ContributeRunsFilter, $offset: Int, $first: Int) {
  contributeRuns(filter: $filter, offset: $offset, first: $first) {
    items { ${RUN} }
    nextCursor
    totals { runs started costUsd prs merged closed noGo noGoCostUsd noGoByCategory { category count } lessons lessonsPassed }
    outcomeCounts { outcome count }
    repos
    days { day runs costUsd prs }
  }
}`) as DocumentNode<
    { contributeRuns: ContributeRunsPage | null },
    { filter?: ContributeRunsFilter; offset?: number; first?: number }
  >;
