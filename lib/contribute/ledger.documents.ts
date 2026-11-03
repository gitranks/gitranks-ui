import { parse } from 'graphql';

import type { ContributeLedger } from './ledger.types';
import type DocumentNode from '@/types/typed-document-node';

const doc = <TData>(source: string) => parse(source) as DocumentNode<TData, Record<string, never>>;

/** Whether the ledger is public (`CONTRIBUTE_LEDGER=public`): the proxy's question, no viewer needed. */
export const ContributeLedgerOpenDocument = doc<{ contributeLedgerOpen: boolean }>(
  'query ContributeLedgerOpen { contributeLedgerOpen }',
);

const LATEST = 'repo at';

export const ContributeLedgerDocument = doc<{ contributeLedger: ContributeLedger | null }>(`query ContributeLedger {
  contributeLedger {
    totals {
      opened merged closed open mergeRate repos people oldestOpenAt
      latestMerged { ${LATEST} }
      latestClosed { ${LATEST} }
    }
    weeks { weekStart merged closed open }
    repos { repo opened merged closed open takesNewPrs latestOpenedAt }
    recent { repo number url title state openedAt endedAt }
    saidNo { total optedOut aiPolicy outsidePrsClosed paused inPool }
    readAt
    preview { prs merged peopleBesides goalPrs goalMerged goalPeopleBesides }
  }
}`);
