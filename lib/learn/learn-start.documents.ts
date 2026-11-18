import { parse } from 'graphql';

import type { LearnStartAttempt, LearnStartCurrent, LearnStartIssue } from './learn-start.types';
import type DocumentNode from '@/types/typed-document-node';

const doc = <TData, TVariables extends Record<string, unknown> = Record<string, never>>(source: string) =>
  parse(source) as DocumentNode<TData, TVariables>;

const ATTEMPT = 'id mode state';

/** Whether the viewer can start a lesson on the issue now, and the issue as Learn's lists show it. Claims nothing. */
export const LearnStartIssueDocument = doc<{ learnStartIssue: LearnStartIssue }, { repo: string; number: number }>(
  `query LearnStartIssue($repo: String!, $number: Int!) {
  learnStartIssue(repo: $repo, number: $number) {
    repo number
    issue { issueId url repo number title language size why }
    refusal limit
    attempt { ${ATTEMPT} }
  }
}`,
);

/** The viewer's newest live attempt on the issue; null while there is none. No GitHub read, no reveal. */
export const LearnStartAttemptDocument = doc<
  { learnStartAttempt: LearnStartAttempt | null },
  { repo: string; number: number }
>(`query LearnStartAttempt($repo: String!, $number: Int!) {
  learnStartAttempt(repo: $repo, number: $number) { ${ATTEMPT} }
}`);

/** The viewer's own lesson in progress, for the link of `OWN_IN_PROGRESS`. */
export const LearnStartCurrentDocument = doc<{ myLearnAttempts: { current: LearnStartCurrent | null } | null }>(
  'query LearnStartCurrent { myLearnAttempts { current { attemptId repo issueNumber title } } }',
);

/** The limit of open pull requests the viewer is at, for `LIMIT_REACHED`: `first: 0` reveals and reads nothing. */
export const LearnStartRoomDocument = doc<{ learnIssues: { room: { limit: string; value: number } | null } | null }>(
  'query LearnStartRoom { learnIssues(first: 0) { room { limit value } } }',
);
