import type { Metadata } from 'next';
import { Suspense } from 'react';

import { GOAL_VISITOR_NOTE } from './copy';
import { LearnGoalQuick } from '@/app/learn/components/learn-goal-quick';
import { FlowBookmark } from '@/components/workspace/getting-in/flow-bookmark';
import { FlowFrame } from '@/components/workspace/getting-in/flow-frame';
import { flowPanelOf, LEARN_FLOW_PANELS } from '@/components/workspace/getting-in/flow-place';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { learnGoalPickOf, learnGoalPickOfProfile } from '@/lib/learn/start-flow';
import { loadLearnFlowPlace } from '@/lib/learn/start-flow.data';
import { searchParamsOf } from '@/lib/workspace/paths';

export const metadata: Metadata = { title: 'Your goal' };

/** Learn's flow, step 1: your goal. No account needed: a visitor's goal goes on in the address, unsaved. */
export default function LearnGoalPage({ searchParams }: PageProps<'/learn/start'>) {
  return (
    <FlowFrame side="learn" step={1}>
      <Suspense fallback={<ContributePageSkeleton />}>
        <LearnGoalStep searchParams={searchParams} />
      </Suspense>
    </FlowFrame>
  );
}

/**
 * The goal question, pre-set to the goal in the address (back from Change) or else the saved one. A visitor's is a
 * draft: the button goes on to Pick an issue with the goal in the address, and nothing is saved. A signed-in person's
 * is saved first, and they get "More choices" too.
 */
async function LearnGoalStep({ searchParams }: Pick<PageProps<'/learn/start'>, 'searchParams'>) {
  const address = learnGoalPickOf(searchParamsOf(await searchParams));
  const { place, gate, profile } = await loadLearnFlowPlace('goal', { goalInAddress: !!address });
  const panel = flowPanelOf(place, LEARN_FLOW_PANELS);
  const visitor = gate.kind === 'signed-out';
  return (
    <>
      {panel ?? (
        <>
          <LearnGoalQuick
            profile={profile}
            flow={{ initial: address ?? learnGoalPickOfProfile(profile), draft: visitor }}
          />
          {visitor ? <p className="text-sm text-muted-foreground">{GOAL_VISITOR_NOTE}</p> : null}
        </>
      )}
      <FlowBookmark side="learn" />
    </>
  );
}
