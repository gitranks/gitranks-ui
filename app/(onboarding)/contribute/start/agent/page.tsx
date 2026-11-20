import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AGENT_HEAD, CHOICE_SIGN_IN } from '../copy';
import { AgentChoice } from '@/components/contribute/start/agent-choice';
import { ApplyWorkPicks } from '@/components/contribute/start/apply-picks';
import { FlowBookmark } from '@/components/workspace/getting-in/flow-bookmark';
import { FlowFrame, FlowHead } from '@/components/workspace/getting-in/flow-frame';
import { CONTRIBUTE_FLOW_PANELS, flowPanelOf } from '@/components/workspace/getting-in/flow-place';
import { FlowSignIn } from '@/components/workspace/getting-in/flow-sign-in';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { loadContribute } from '@/lib/workspace/contribute.data';
import { loadContributeFlowPlace } from '@/lib/workspace/getting-in.data';

export const metadata: Metadata = { title: 'Your agent' };

/** Contribute's flow, step 2: who does the work. A visitor signs in here, the picks of step 1 kept in the address. */
export default function ContributeAgentPage() {
  return (
    <FlowFrame side="contribute" step={2}>
      <Suspense fallback={<ContributePageSkeleton />}>
        <ContributeAgentChoice />
      </Suspense>
    </FlowFrame>
  );
}

async function ContributeAgentChoice() {
  const { place, gate } = await loadContributeFlowPlace('agent');
  const panel = flowPanelOf(place, CONTRIBUTE_FLOW_PANELS);
  const visitor = gate.kind === 'signed-out';
  return (
    <>
      {panel ?? (
        <>
          <FlowHead {...AGENT_HEAD} />
          {visitor ? (
            <FlowSignIn {...CHOICE_SIGN_IN} source="contribute_flow_sign_in" />
          ) : (
            <ApplyWorkPicks saved={!!(await loadContribute())?.contributor?.preferences} />
          )}
          <AgentChoice enabled={!visitor} />
        </>
      )}
      <FlowBookmark side="contribute" />
    </>
  );
}
