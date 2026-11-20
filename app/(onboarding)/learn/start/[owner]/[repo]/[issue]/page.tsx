import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';

import { AccountIssueStep, SavingIssueStep, VisitorIssueStep } from '../../../components/issue-step';
import { FlowBookmark } from '@/components/workspace/getting-in/flow-bookmark';
import { FlowFrame } from '@/components/workspace/getting-in/flow-frame';
import { flowPanelOf, LEARN_FLOW_PANELS } from '@/components/workspace/getting-in/flow-place';
import { ContributePageSkeleton } from '@/components/workspace/page-skeleton';
import { hasGoal } from '@/lib/learn/learn-home';
import { learnGoalPickOf } from '@/lib/learn/start-flow';
import { loadLearnFlowPlace } from '@/lib/learn/start-flow.data';
import { searchParamsOf } from '@/lib/workspace/paths';
import { learnStartIssueOf } from '@/lib/workspace/start/start-page';

export const metadata: Metadata = { title: 'Start your own lesson' };

type Params = PageProps<'/learn/start/[owner]/[repo]/[issue]'>;

/**
 * Learn's flow, step 3: your agent, at the picked issue's own start address, so the issue survives the sign-in and the
 * agent's connection. Learn runs on the person's own agent only.
 */
export default function LearnIssueStepPage({ params, searchParams }: Params) {
  return (
    <FlowFrame side="learn" step={3}>
      <Suspense fallback={<ContributePageSkeleton />}>
        <LearnIssueStep params={params} searchParams={searchParams} />
      </Suspense>
    </FlowFrame>
  );
}

/**
 * The address is checked first: a bad owner, repo or number is a 404 for everyone. Then where the person belongs: a
 * visitor signs in here; an account with no goal saved and one in the address saves it first; one with a goal saved
 * gets the Start page read for them; an entered one goes on to the Start page under `/my`, its goal saved first when
 * only the address has it.
 */
async function LearnIssueStep({ params, searchParams }: Pick<Params, 'params' | 'searchParams'>) {
  const [{ owner, repo, issue }, search] = await Promise.all([params, searchParams]);
  const named = learnStartIssueOf(owner, repo, issue);
  if (!named) notFound();
  const issueRef = { repo: named.repo, issue: named.number };
  const goal = learnGoalPickOf(searchParamsOf(search));
  const { place, gate, profile } = await loadLearnFlowPlace('issue', { goalInAddress: !!goal, issue: issueRef });
  let step: ReactNode = flowPanelOf(place, LEARN_FLOW_PANELS);
  if (!step) {
    if (place.kind === 'apply-then') {
      step = <SavingIssueStep issueRef={issueRef} goal={goal} profile={profile} moveTo={place.to} />;
    } else if (gate.kind === 'signed-out') {
      step = <VisitorIssueStep issueRef={issueRef} goal={goal} />;
    } else if (!hasGoal(profile)) {
      step = <SavingIssueStep issueRef={issueRef} goal={goal} profile={profile} />;
    } else {
      step = <AccountIssueStep issueRef={issueRef} goal={goal} profile={profile} />;
    }
  }
  return (
    <>
      {step}
      <FlowBookmark side="learn" />
    </>
  );
}
