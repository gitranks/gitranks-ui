import type { Metadata } from 'next';
import { Suspense } from 'react';

import { BACK_TO_CHOICE, CONNECT_SIGN_IN, OWN_AGENT_HEAD } from '../../copy';
import { OwnAgentStep } from '@/components/contribute/start/own-agent-step';
import { FlowBookmark } from '@/components/workspace/getting-in/flow-bookmark';
import { FlowBack, FlowFrame } from '@/components/workspace/getting-in/flow-frame';
import { CONTRIBUTE_FLOW_PANELS, flowPanelOf } from '@/components/workspace/getting-in/flow-place';
import { FlowSignIn } from '@/components/workspace/getting-in/flow-sign-in';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { HEADING } from '@/components/workspace/primitives';
import { loadContribute } from '@/lib/workspace/contribute.data';
import { loadContributeFlowPlace } from '@/lib/workspace/getting-in.data';
import { GETTING_IN_PATHS, searchParamsOf } from '@/lib/workspace/paths';

export const metadata: Metadata = { title: OWN_AGENT_HEAD.title };

/**
 * Contribute's flow, step 2 with the person's own agent: the connect steps, then on to the first issue. The title is
 * part of what changes: a setting-up or no-profile panel has its own, and stands alone.
 */
export default function ContributeOwnAgentPage({ searchParams }: PageProps<'/contribute/start/agent/own'>) {
  return (
    <FlowFrame side="contribute" step={2}>
      <FlowBack href={GETTING_IN_PATHS.contributeAgent}>{BACK_TO_CHOICE}</FlowBack>
      <Suspense fallback={<ContributePageSkeleton />}>
        <ContributeOwnAgent searchParams={searchParams} />
      </Suspense>
    </FlowFrame>
  );
}

async function ContributeOwnAgent({ searchParams }: Pick<PageProps<'/contribute/start/agent/own'>, 'searchParams'>) {
  // An account that has entered is sent on to the Agent tab's connect page, the query (`?from=agent`) kept.
  const query = searchParamsOf(await searchParams).toString();
  const { place } = await loadContributeFlowPlace('agent-own', query);
  const panel = flowPanelOf(place, CONTRIBUTE_FLOW_PANELS);
  const head = (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-primary">{OWN_AGENT_HEAD.eyebrow}</span>
      <h1 className={HEADING.page}>{OWN_AGENT_HEAD.title}</h1>
    </div>
  );
  let step = panel;
  if (!step && place.kind === 'sign-in') {
    step = (
      <>
        {head}
        <FlowSignIn {...CONNECT_SIGN_IN} source="contribute_flow_sign_in" />
      </>
    );
  } else if (!step) {
    const view = await loadContribute();
    step = (
      <>
        {head}
        <OwnAgentStep
          tokens={view?.ownAgent?.tokens}
          signIn={view?.ownAgent?.signIn === true}
          openedAt={new Date().toISOString()}
        />
      </>
    );
  }
  return (
    <>
      {step}
      <FlowBookmark side="contribute" />
    </>
  );
}
