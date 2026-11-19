import { parse } from 'graphql';

import type { StartPageAttempt, StartPageCurrent, StartPageIssue } from './start-page.types';
import type { ContributeLimits, ContributeScheduleCounts, ContributeSettings } from '@/lib/workspace/contribute.types';
import type DocumentNode from '@/types/typed-document-node';

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const ATTEMPT = 'id mode state';

/** Whether the viewer can start the issue now in the page's mode, and the issue as the lists show it. Claims nothing. */
export const StartPageIssueDocument = doc<
  { startPageIssue: StartPageIssue },
  { repo: string; number: number; mode: 'FIX' | 'LEARN' }
>(
  `query StartPageIssue($repo: String!, $number: Int!, $mode: ContributeAttemptMode) {
  startPageIssue(repo: $repo, number: $number, mode: $mode) {
    repo number
    issue { issueId url repo number title language size why }
    refusal limit
    attempt { ${ATTEMPT} }
  }
}`,
);

/** The viewer's newest live attempt on the issue, any mode; null while there is none. No GitHub read, no reveal. */
export const StartPageAttemptDocument = doc<
  { startPageAttempt: StartPageAttempt | null },
  { repo: string; number: number }
>(`query StartPageAttempt($repo: String!, $number: Int!) {
  startPageAttempt(repo: $repo, number: $number) { ${ATTEMPT} }
}`);

/** The viewer's own lesson in progress, for the link of `OWN_IN_PROGRESS`. */
export const StartPageCurrentDocument = doc<{ myLearnAttempts: { current: StartPageCurrent | null } | null }>(
  'query StartPageCurrent { myLearnAttempts { current { attemptId repo issueNumber title } } }',
);

/** The limits a `LIMIT_REACHED` names: the settings, the level's caps, and what the open pull request limit counts. */
export const StartPageLimitsDocument = doc<{
  contribute: {
    contributor: {
      settings: Pick<ContributeSettings, 'attemptsAtATime' | 'openPrsAtATime'> | null;
      limits: ContributeLimits | null;
      scheduleCounts: Pick<ContributeScheduleCounts, 'prBound'> | null;
    } | null;
  } | null;
}>(
  `query StartPageLimits { contribute { contributor {
  settings { attemptsAtATime openPrsAtATime }
  limits { level reason attemptsAtATime openPrsAtATime openPrsEffective openPrsOverride claimsPerDay revealsPerDay }
  scheduleCounts { prBound }
} } }`,
);

/** Lesson mode's restart sentence: whether each connection's tool list was last seen holding GitRanks Learn. */
export const StartPageListedDocument = doc<{
  contribute: { mcpTokens: { id: string; lastUsedAt: string | null; learnListed: boolean | null }[] | null } | null;
}>('query StartPageListed { contribute { mcpTokens { id lastUsedAt learnListed } } }');
