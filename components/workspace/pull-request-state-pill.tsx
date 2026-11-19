import { Pill } from '@/components/pill/pill';
import { PR_CHECKS, PR_STATES, toneLabelOf } from '@/lib/workspace/attempt-format';
import type { ContributeAttemptPullRequest } from '@/lib/workspace/contribute.types';

/**
 * A pull request's state as one pill: merged, closed, or while open what holds it (changes requested, failing checks),
 * else open.
 */
export function PullRequestStatePill({
  pullRequest,
}: {
  pullRequest: Pick<ContributeAttemptPullRequest, 'state' | 'reviewDecision' | 'checks'>;
}) {
  if (pullRequest.state === 'OPEN') {
    if (pullRequest.reviewDecision === 'CHANGES_REQUESTED') return <Pill tone="amber">Changes requested</Pill>;
    if (pullRequest.checks === 'FAILURE' || pullRequest.checks === 'ERROR') {
      return <Pill tone="red">{PR_CHECKS[pullRequest.checks]}</Pill>;
    }
  }
  const state = toneLabelOf(PR_STATES, pullRequest.state);
  return <Pill tone={state.tone}>{state.label}</Pill>;
}
