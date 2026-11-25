import type { Metadata } from 'next';
import { Suspense } from 'react';

import { BACK_TO_CHOICE, OWN_AGENT_HEAD } from '../../copy';
import { OwnAgentStep } from '@/components/contribute/start/own-agent-step';
import { FlowBackHere } from '@/components/workspace/getting-in/flow-back-here';
import { FlowBookmark } from '@/components/workspace/getting-in/flow-bookmark';
import { FlowFrame } from '@/components/workspace/getting-in/flow-frame';
import { CONTRIBUTE_FLOW_PANELS, flowPanelOf } from '@/components/workspace/getting-in/flow-place';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { HEADING } from '@/components/workspace/primitives';
import { loadContribute } from '@/lib/workspace/contribute.data';
import { flowWayBackOf } from '@/lib/workspace/flow-way-back';
import { loadContributeFlowPlace } from '@/lib/workspace/getting-in.data';
import { GETTING_IN_PATHS, searchParamsOf } from '@/lib/workspace/paths';

export const metadata: Metadata = { title: OWN_AGENT_HEAD.title };

/**
 * Contribute's flow, the first step's own agent: the connect steps, then on to the first issue. The title is part of
 * what changes: a setting-up or no-profile panel has its own, and stands alone.
 */
export default function ContributeOwnAgentPage({ searchParams }: PageProps<'/contribute/start/agent/own'>) {
  return (
    <FlowFrame side="contribute" step={1}>
      <FlowBackHere href={GETTING_IN_PATHS.contributeStart}>{BACK_TO_CHOICE}</FlowBackHere>
      <Suspense fallback={<ContributePageSkeleton />}>
        <ContributeOwnAgent searchParams={searchParams} />
      </Suspense>
    </FlowFrame>
  );
}

async function ContributeOwnAgent({ searchParams }: Pick<PageProps<'/contribute/start/agent/own'>, 'searchParams'>) {
  // A person with the Contribute sign is sent on to the Agent tab's connect page, the query (`?from=agent`) kept.
  const params = await searchParams;
  const { place } = await loadContributeFlowPlace('agent-own', {
    query: searchParamsOf(params).toString(),
    issue: flowWayBackOf(params),
  });
  const panel = flowPanelOf(place, CONTRIBUTE_FLOW_PANELS);
  const view = panel ? null : await loadContribute();
  return (
    <>
      {panel ?? (
        <>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-primary">{OWN_AGENT_HEAD.eyebrow}</span>
            <h1 className={HEADING.page}>{OWN_AGENT_HEAD.title}</h1>
          </div>
          <OwnAgentStep
            tokens={view?.ownAgent?.tokens}
            signIn={view?.ownAgent?.signIn === true}
            openedAt={new Date().toISOString()}
          />
        </>
      )}
      <FlowBookmark side="contribute" />
    </>
  );
}
