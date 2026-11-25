'use client';

import type { Route } from 'next';

import { AgentConnect } from '@/components/workspace/agent/agent-connect';
import { useOnboardedPush } from '@/components/workspace/use-onboarded-push';
import type { ContributeMcpToken } from '@/lib/workspace/contribute.types';
import { flowWayBackHereOf, withFlowWayBack } from '@/lib/workspace/flow-way-back';
import { GETTING_IN_PATHS } from '@/lib/workspace/paths';

/**
 * Your own agent, on the first step of Contribute's flow: the connect steps embedded under the page's own title (the
 * agent, its setup, the wait for its first call). Once it calls, the connect is counted as everywhere, and the page goes
 * on to the second step, the way back (`?issue=`) kept.
 */
export function OwnAgentStep({
  tokens,
  signIn,
  openedAt,
}: {
  tokens: ContributeMcpToken[] | undefined;
  signIn: boolean;
  openedAt: string;
}) {
  const goTo = useOnboardedPush();
  return (
    <AgentConnect
      embedded
      onboarded={false}
      tokens={tokens}
      signIn={signIn}
      keyLink={false}
      openedAt={openedAt}
      withVsCode
      onConnected={() =>
        goTo(withFlowWayBack(GETTING_IN_PATHS.contributeIssue, flowWayBackHereOf()) as Route, { replace: true })
      }
    />
  );
}
