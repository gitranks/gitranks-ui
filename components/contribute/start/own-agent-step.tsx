'use client';

import { AgentConnect } from '@/components/workspace/agent/agent-connect';
import { useOnboardedPush } from '@/components/workspace/use-onboarded-push';
import type { ContributeMcpToken } from '@/lib/workspace/contribute.types';
import { GETTING_IN_PATHS } from '@/lib/workspace/paths';

/**
 * Your own agent, step 2 of Contribute's flow: the connect steps embedded under the page's own title (the agent, its
 * setup, the wait for its first call). Once it calls, the connect is counted as everywhere, and the page goes on to the
 * first issue.
 */
export function OwnAgentStep({
  tokens,
  signIn,
  learnOpen,
  openedAt,
}: {
  tokens: ContributeMcpToken[] | undefined;
  signIn: boolean;
  learnOpen: boolean;
  openedAt: string;
}) {
  const goTo = useOnboardedPush();
  return (
    <AgentConnect
      embedded
      onboarded={false}
      tokens={tokens}
      signIn={signIn}
      learnOpen={learnOpen}
      keyLink={false}
      openedAt={openedAt}
      onConnected={() => goTo(GETTING_IN_PATHS.contributeIssue, { replace: true })}
    />
  );
}
