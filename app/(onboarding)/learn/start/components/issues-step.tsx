import type { Route } from 'next';
import type { ReactNode } from 'react';

import { ApplyLearnGoal } from './apply-goal';
import { SeeAllIssues } from './see-all';
import { LearnIssueList } from '@/app/(workspace)/learn/components/issue-list';
import { PracticeSection } from '@/app/learn/components/practice-lessons';
import { GoalChips } from '@/components/learn/goal-chips';
import { LearnIssuesEmpty, LearnNoneReady } from '@/components/learn/learn-issue-notes';
import { FlowHead } from '@/components/workspace/getting-in/flow-frame';
import { loadLearnIssues, loadPracticeLessons } from '@/lib/learn/learn.data';
import type { LearnGoalView, LearnProfile } from '@/lib/learn/learn.types';
import { goalValueOf, goalViewOf, hasGoal } from '@/lib/learn/learn-home';
import { LEARN_ISSUES_FIRST, learnIssuesTextOf, PRACTICE_FIRST } from '@/lib/learn/learn-tab';
import {
  goalViewOfPick,
  issueStepTargetOf,
  type LearnGoalPick,
  learnIssuesOfPublic,
  withLearnGoal,
} from '@/lib/learn/start-flow';
import { readLearnPublicIssues, readLearnPublicPractice } from '@/lib/learn/start-flow.data';
import { loadContribute } from '@/lib/workspace/contribute.data';
import { isSuspended } from '@/lib/workspace/contribute-state';
import { GETTING_IN_PATHS } from '@/lib/workspace/paths';

const PRACTICE_TITLE = 'Practice first?';
const PRACTICE_TEXT =
  'See how a lesson works on a finished fix before your own. Each was written for another learner with the same goal, and needs no agent.';

/** Pick an issue's head: its title, the line for the goal, and the goal's chips with Change (back to Your goal). */
function IssuesHead({ goal, changeHref }: { goal: LearnGoalView | null; changeHref: Route }) {
  return (
    <FlowHead title="Pick an issue for your lesson" text={learnIssuesTextOf(goal)}>
      {goal ? <GoalChips goal={goal} changeHref={changeHref} /> : null}
    </FlowHead>
  );
}

/** The list's place on the step. */
const Issues = ({ who, children }: { who: 'visitor' | 'account'; children: ReactNode }) => (
  <section aria-label="Issues" className="flex flex-col gap-4" data-learn-flow-issues={who}>
    {children}
  </section>
);

/**
 * A visitor's Pick an issue, for the goal in the address: the day's short list for the language (the same for every
 * visitor that day), each Start a lesson leading to the issue's step with the goal in its address, then how many it
 * shows of about how many and Sign in with GitHub to see all; then the language's public practice lessons. None ready
 * today, or a list that could not be read, each says so with one next step.
 */
export async function VisitorIssues({ goal }: { goal: LearnGoalPick }) {
  const view = goalViewOfPick(goal);
  const change = withLearnGoal(GETTING_IN_PATHS.learnGoal, goal);
  const [issues, practice] = await Promise.all([
    readLearnPublicIssues(goal.language),
    readLearnPublicPractice(goal.language),
  ]);
  const list = issues.ok ? issues.data : null;
  let body: ReactNode;
  if (!issues.ok) {
    body = <LearnIssuesEmpty issues={undefined} goal={goal.language} changeHref={change} />;
  } else if (!list?.items.length) {
    body = <LearnNoneReady language={goal.language} changeHref={change} />;
  } else {
    body = (
      <>
        <p className="text-sm text-muted-foreground sm:self-end">Starting asks you to sign in with GitHub.</p>
        <LearnIssueList
          issues={learnIssuesOfPublic(list, view)}
          start={issueStepTargetOf(goal)}
          more={false}
          source="learn_flow_issue"
          changeHref={change}
        />
        <SeeAllIssues shown={list.items.length} total={list.total} />
      </>
    );
  }
  return (
    <>
      <IssuesHead goal={view} changeHref={change} />
      <Issues who="visitor">{body}</Issues>
      <PracticeSection
        practice={practice.ok ? (practice.data ?? undefined) : undefined}
        goal={goal.language}
        title={PRACTICE_TITLE}
        text={PRACTICE_TEXT}
        source="learn_flow_practice"
        visitor
      />
    </>
  );
}

/**
 * Pick an issue for a signed-in person who has not entered. With no goal saved (they signed in from a visitor's list,
 * the goal in the address): "Saving your goal…" in the list's place until it is saved and the page reads itself again.
 * With one saved: their own list for it (10, then Show 10 more), each Start a lesson leading to the issue's step, and
 * practice lessons they haven't passed; a goal the address still carries leaves it, unwritten.
 */
export async function AccountIssues({
  profile,
  address,
}: {
  profile: LearnProfile | null;
  address: LearnGoalPick | null;
}) {
  if (!hasGoal(profile)) {
    return (
      <>
        <IssuesHead
          goal={address ? goalViewOfPick(address) : null}
          changeHref={withLearnGoal(GETTING_IN_PATHS.learnGoal, address)}
        />
        <Issues who="account">
          <ApplyLearnGoal goal={address} profile={profile} saved={false} />
        </Issues>
      </>
    );
  }
  const [issues, practice, view] = await Promise.all([
    loadLearnIssues(LEARN_ISSUES_FIRST),
    loadPracticeLessons(PRACTICE_FIRST),
    loadContribute().catch(() => null),
  ]);
  const goal = issues?.goal ?? goalViewOf(profile);
  return (
    <>
      <ApplyLearnGoal goal={address} profile={profile} saved />
      <IssuesHead goal={goal} changeHref={GETTING_IN_PATHS.learnGoal} />
      <Issues who="account">
        <LearnIssueList
          issues={issues}
          held={isSuspended(view)}
          start={issueStepTargetOf(null)}
          source="learn_flow_issue"
          changeHref={GETTING_IN_PATHS.learnGoal}
        />
      </Issues>
      <PracticeSection
        practice={practice}
        goal={goalValueOf(goal)}
        title={PRACTICE_TITLE}
        text={PRACTICE_TEXT}
        source="learn_flow_practice"
      />
    </>
  );
}

/**
 * An account that has entered, back from the sign-in with a goal in the address and none saved: the goal is saved
 * first, then the page moves on to `moveTo` (the Learn tab), so the goal is never lost.
 */
export function EnteredIssues({
  profile,
  address,
  moveTo,
}: {
  profile: LearnProfile | null;
  address: LearnGoalPick | null;
  moveTo: Route;
}) {
  return (
    <>
      <IssuesHead goal={address ? goalViewOfPick(address) : null} changeHref={GETTING_IN_PATHS.learnGoal} />
      <Issues who="account">
        <ApplyLearnGoal goal={address} profile={profile} saved={false} moveTo={moveTo} />
      </Issues>
    </>
  );
}
