import type { Metadata } from 'next';
import { Suspense } from 'react';

import { CONNECT_SIGN_IN } from '../../sign-in-copy';
import { OwnAgentStep } from '@/components/contribute/start/own-agent-step';
import { FlowBookmark } from '@/components/workspace/getting-in/flow-bookmark';
import { FlowBack, FlowFrame } from '@/components/workspace/getting-in/flow-frame';
import { CONTRIBUTE_FLOW_PANELS, flowPanelOf } from '@/components/workspace/getting-in/flow-place';
import { FlowSignIn } from '@/components/workspace/getting-in/flow-sign-in';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { HEADING } from '@/components/workspace/primitives';
import { loadContribute } from '@/lib/workspace/contribute.data';
import { loadContributeFlowPlace } from '@/lib/workspace/getting-in.data';
import { GETTING_IN_PATHS } from '@/lib/workspace/paths';

export const metadata: Metadata = { title: 'Connect your own agent' };

/** Contribute's flow, step 2 with the person's own agent: the connect steps, then on to the first issue. */
export default function ContributeOwnAgentPage() {
  return (
    <FlowFrame side="contribute" step={2}>
      <div className="flex flex-col gap-2">
        <FlowBack href={GETTING_IN_PATHS.contributeAgent}>Two ways</FlowBack>
        <span className="text-xs font-semibold text-primary">About a minute · no Claude key needed</span>
        <h1 className={HEADING.page}>Connect your own agent</h1>
      </div>
      <Suspense fallback={<ContributePageSkeleton />}>
        <ContributeOwnAgent />
      </Suspense>
    </FlowFrame>
  );
}

async function ContributeOwnAgent() {
  const { place, gate } = await loadContributeFlowPlace('agent-own');
  const panel = flowPanelOf(place, CONTRIBUTE_FLOW_PANELS);
  let step = panel;
  if (!step && place.kind === 'sign-in') {
    step = <FlowSignIn {...CONNECT_SIGN_IN} source="contribute_flow_sign_in" />;
  } else if (!step) {
    const view = await loadContribute();
    step = (
      <OwnAgentStep
        tokens={view?.ownAgent?.tokens}
        signIn={view?.ownAgent?.signIn === true}
        learnOpen={gate.kind === 'open' && gate.learnOpen}
        openedAt={new Date().toISOString()}
      />
    );
  }
  return (
    <>
      {step}
      <FlowBookmark side="contribute" />
    </>
  );
}
