import { Check } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { ApplyLearnGoal } from './apply-goal';
import { IssueStepBody } from './issue-step-body';
import { Pill } from '@/components/pill/pill';
import { FlowBack } from '@/components/workspace/getting-in/flow-frame';
import { FlowSignIn } from '@/components/workspace/getting-in/flow-sign-in';
import { HEADING } from '@/components/workspace/primitives';
import type { StartPageCard } from '@/components/workspace/start/start-page-screen';
import { WorkspaceLive } from '@/components/workspace/workspace-live';
import type { LearnProfile } from '@/lib/learn/learn.types';
import { learnGoalLabelOf } from '@/lib/learn/profile-form';
import { goalDiffersFrom, type LearnGoalPick, learnGoalLabelOfPick, withLearnGoal } from '@/lib/learn/start-flow';
import { readLearnPublicIssues } from '@/lib/learn/start-flow.data';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import { GETTING_IN_PATHS } from '@/lib/workspace/paths';
import { loadStartPageView } from '@/lib/workspace/start/start-page.data';

type IssueRef = { repo: string; issue: number };

const BACK_LABEL = 'Issues for your goal';
const link = 'font-semibold text-link hover:underline';

/** Back to Pick an issue, the goal kept: in the address for a visitor (and until it is saved), saved otherwise. */
const backOf = (goal: LearnGoalPick | null): Route => withLearnGoal(GETTING_IN_PATHS.learnIssues, goal);

/**
 * The issue's card before anything is read for the person: the repo and title only for an issue on the day's public
 * list for the address's language (step 2's own read), so the page never presents a repository GitRanks did not list;
 * otherwise "The issue you picked" and its Issue chip. The goal comes with the person, or the card leads to Your goal.
 */
async function publicCardOf(ref: IssueRef, goal: LearnGoalPick | null): Promise<StartPageCard> {
  // No goal in the address: the lesson is written for one, so the card leads to Your goal (never to Settings).
  if (!goal) {
    return {
      goalLine: (
        <>
          Your lesson is written for your goal.{' '}
          <Link href={GETTING_IN_PATHS.learnGoal} prefetch={false} className={link}>
            Pick your goal
          </Link>
        </>
      ),
    };
  }
  const goalLine = `Your lesson will be written for: ${learnGoalLabelOfPick(goal)}`;
  const list = await readLearnPublicIssues(goal.language);
  const listed = list.ok
    ? list.data?.items.find((item) => item.number === ref.issue && item.repo.toLowerCase() === ref.repo.toLowerCase())
    : undefined;
  return listed ? { repo: listed.repo, title: listed.title, goalLine } : { goalLine };
}

/**
 * A visitor: section 1 signs in with GitHub and comes back to this address with the goal in it; Connect your agent and
 * the prompt are dimmed until then, and nothing is asked for them.
 */
export async function VisitorIssueStep({ issueRef, goal }: { issueRef: IssueRef; goal: LearnGoalPick | null }) {
  const comes = goal ? ` Your goal comes with you: ${learnGoalLabelOfPick(goal)}.` : '';
  return (
    <>
      <FlowBack href={backOf(goal)}>{BACK_LABEL}</FlowBack>
      <IssueStepBody
        issueRef={issueRef}
        view={null}
        card={await publicCardOf(issueRef, goal)}
        locked
        firstSection={
          <FlowSignIn
            title="1 · Sign in with GitHub"
            text={`The lesson and the pull request will be in your name.${comes}`}
            source="learn_flow_sign_in"
          />
        }
        backHref={backOf(goal)}
        backLabel={BACK_LABEL}
      />
    </>
  );
}

/**
 * Signed in with no goal saved, the goal in the address (back from the sign-in): "Saving your goal…" in section 1's
 * place, the steps after it dimmed. Once it is saved the page reads itself again (now with the account set up for the
 * start read), or moves on to `moveTo` for an account that has entered. Nothing about the issue is read for the person
 * before then.
 */
export async function SavingIssueStep({
  issueRef,
  goal,
  profile,
  moveTo,
}: {
  issueRef: IssueRef;
  goal: LearnGoalPick | null;
  profile: LearnProfile | null;
  moveTo?: Route;
}) {
  return (
    <>
      <FlowBack href={backOf(goal)}>{BACK_LABEL}</FlowBack>
      <IssueStepBody
        issueRef={issueRef}
        view={null}
        card={await publicCardOf(issueRef, goal)}
        locked
        firstSection={<ApplyLearnGoal goal={goal} profile={profile} saved={false} moveTo={moveTo} />}
        backHref={backOf(goal)}
        backLabel={BACK_LABEL}
      />
    </>
  );
}

/** Section 1 once signed in, collapsed to one line. */
function SignedIn({ login }: { login: string | null }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border bg-card p-4.5 sm:p-5.5" data-flow-signed-in="">
      <div className="flex items-center justify-between gap-2">
        <h2 className={HEADING.card}>1 · Sign in with GitHub</h2>
        <Pill tone="green">
          <Check aria-hidden="true" />
          Done
        </Pill>
      </div>
      <p className="text-sm text-muted-foreground">{login ? `Signed in as @${login}.` : 'Signed in.'}</p>
    </section>
  );
}

/**
 * Signed in with a goal saved, not entered: the Start page in lesson mode, read for them, with section 1 collapsed.
 * The issue counts as one new issue of their day, as Learn's start read does. A goal the address carries is never
 * written: it leaves the address, and when it differs the card says the lesson is for the saved one, with Change. The
 * page holds the workspace's poll itself (no tabs here) to notice the agent's claim.
 */
export async function AccountIssueStep({
  issueRef,
  goal,
  profile,
}: {
  issueRef: IssueRef;
  goal: LearnGoalPick | null;
  profile: LearnProfile | null;
}) {
  const saved = learnGoalLabelOf(profile);
  const [load, login] = await Promise.all([loadStartPageView(issueRef, 'lesson', saved), viewerLogin()]);
  if (load.kind === 'not-found') notFound();
  if (load.kind === 'claimed') redirect(load.href);
  const goalLine =
    goal && goalDiffersFrom(goal, profile) ? (
      <>
        Your lesson will be written for your saved goal: {saved}.{' '}
        <Link href={GETTING_IN_PATHS.learnGoal} prefetch={false} className={link}>
          Change
        </Link>
      </>
    ) : saved ? (
      `Your lesson will be written for: ${saved}`
    ) : undefined;
  return (
    <>
      <FlowBack href={backOf(null)}>{BACK_LABEL}</FlowBack>
      <WorkspaceLive>
        <IssueStepBody
          issueRef={issueRef}
          view={load.view}
          card={{ goalLine }}
          firstSection={
            <>
              <ApplyLearnGoal goal={goal} profile={profile} saved />
              <SignedIn login={login ?? null} />
            </>
          }
          backHref={backOf(null)}
          backLabel={BACK_LABEL}
        />
      </WorkspaceLive>
    </>
  );
}
