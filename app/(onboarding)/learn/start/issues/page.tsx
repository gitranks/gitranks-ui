import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AccountIssues, EnteredIssues, VisitorIssues } from '../components/issues-step';
import { FlowBookmark } from '@/components/workspace/getting-in/flow-bookmark';
import { FlowFrame } from '@/components/workspace/getting-in/flow-frame';
import { flowPanelOf, LEARN_FLOW_PANELS } from '@/components/workspace/getting-in/flow-place';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { learnGoalPickOf } from '@/lib/learn/start-flow';
import { loadLearnFlowPlace } from '@/lib/learn/start-flow.data';
import { searchParamsOf } from '@/lib/workspace/paths';

export const metadata: Metadata = { title: 'Pick an issue' };

/**
 * Learn's flow, step 2: pick an issue. A visitor reads the day's short list for the goal in the address; a signed-in
 * person their own list for the saved goal.
 */
export default function LearnIssuesPage({ searchParams }: PageProps<'/learn/start/issues'>) {
  return (
    <FlowFrame side="learn" step={2}>
      <Suspense fallback={<ContributePageSkeleton />}>
        <LearnIssuesStep searchParams={searchParams} />
      </Suspense>
    </FlowFrame>
  );
}

async function LearnIssuesStep({ searchParams }: Pick<PageProps<'/learn/start/issues'>, 'searchParams'>) {
  const address = learnGoalPickOf(searchParamsOf(await searchParams));
  const { place, gate, profile } = await loadLearnFlowPlace('issues', { goalInAddress: !!address });
  const panel = flowPanelOf(place, LEARN_FLOW_PANELS);
  let step = panel;
  if (!panel) {
    if (place.kind === 'apply-then') step = <EnteredIssues profile={profile} address={address} moveTo={place.to} />;
    else if (gate.kind === 'signed-out') step = address ? <VisitorIssues goal={address} /> : null;
    else step = <AccountIssues profile={profile} address={address} />;
  }
  return (
    <>
      {step}
      <FlowBookmark side="learn" />
    </>
  );
}
