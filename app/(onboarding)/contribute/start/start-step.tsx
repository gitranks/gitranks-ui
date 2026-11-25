import { Suspense } from 'react';

import { WhoDoesTheWork } from '@/components/contribute/start/who-does-the-work';
import { FlowBookmark } from '@/components/workspace/getting-in/flow-bookmark';
import { FlowFrame } from '@/components/workspace/getting-in/flow-frame';
import { CONTRIBUTE_FLOW_PANELS, flowPanelOf } from '@/components/workspace/getting-in/flow-place';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { startWaysOf, startWaysReadOf } from '@/lib/contribute/start-ways';
import { loadContribute } from '@/lib/workspace/contribute.data';
import { flowWayBackOf } from '@/lib/workspace/flow-way-back';
import { loadContributeFlowPlace, loadOpenedIssue } from '@/lib/workspace/getting-in.data';

type Query = Promise<Record<string, string | string[] | undefined>>;

/**
 * The first step of Contribute's flow, "Your agent", drawn at the flow's root and again at `/agent`: how Contribute
 * works, then who does the work. A visitor's buttons sign in first. The way back (`?issue=`) rides on every button.
 */
export function StartStep({ searchParams }: { searchParams: Query }) {
  return (
    <FlowFrame side="contribute" step={1}>
      <Suspense fallback={<ContributePageSkeleton />}>
        <StartStepBody searchParams={searchParams} />
      </Suspense>
    </FlowFrame>
  );
}

async function StartStepBody({ searchParams }: { searchParams: Query }) {
  const issue = flowWayBackOf(await searchParams);
  const { place, gate, facts } = await loadContributeFlowPlace('agent', { issue });
  const panel = flowPanelOf(place, CONTRIBUTE_FLOW_PANELS);
  if (panel) {
    return (
      <>
        {panel}
        <FlowBookmark side="contribute" />
      </>
    );
  }
  const [view, opened] = await Promise.all([gate.kind === 'open' ? loadContribute() : null, loadOpenedIssue(issue)]);
  const ways = startWaysOf(startWaysReadOf({ gate, view, attempt: facts.hasAttempt, issue, issueReads: !!opened }));
  return (
    <>
      <WhoDoesTheWork ways={ways} />
      <FlowBookmark side="contribute" />
    </>
  );
}
