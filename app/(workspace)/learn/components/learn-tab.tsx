import { ArrowRight, GitPullRequest, GraduationCap, type LucideIcon, Terminal } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { LearnIssueList } from './issue-list';
import { LearnGoalQuick } from '@/app/learn/components/learn-goal-quick';
import { LearnSettingUp } from '@/app/learn/components/learn-setting-up';
import { PracticeSection } from '@/app/learn/components/practice-lessons';
import { PATH_ICONS, StepStrip } from '@/app/learn/components/stage-strip';
import { Pill } from '@/components/pill/pill';
import { Button } from '@/components/ui/button';
import { NumberTiles } from '@/components/workspace/number-tiles';
import { HEADING } from '@/components/workspace/primitives';
import { RightNow } from '@/components/workspace/right-now';
import type {
  LearnGoalView,
  LearnIssues,
  LearnProfile,
  MyLearnAttempts,
  PracticeLessons,
} from '@/lib/learn/learn.types';
import { currentOf, goalValueOf, goalViewOf, hasGoal } from '@/lib/learn/learn-home';
import { LEARN_ABOUT_PATH, LEARN_MAINTAINERS_PATH } from '@/lib/learn/learn-path';
import {
  headPartOf,
  type LearnTabState,
  learnTilesOf,
  ONE_AT_A_TIME,
  pathMarksOf,
  pathStepsOf,
  stepThreeOf,
} from '@/lib/learn/learn-tab';
import type { LearnProgressCounts } from '@/lib/learn/progress/progress.types';
import type { ContributeActivity } from '@/lib/workspace/contribute.types';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

const link = 'font-semibold text-link hover:underline';

const HOW_A_LESSON_IS_MADE: { Icon: LucideIcon; title: string; text: string }[] = [
  {
    Icon: Terminal,
    title: 'Your agent fixes a real issue',
    text: 'One you pick, from a project that takes outside pull requests. In your terminal, with the plan you already have.',
  },
  {
    Icon: GraduationCap,
    title: 'It writes a lesson about that fix, for you',
    text: 'Made for this issue and your goal: what was wrong, why the fix works, how it fits the project. A few short steps, a question after each.',
  },
  {
    Icon: GitPullRequest,
    title: 'You pass it, and the pull request opens',
    text: 'From your fork, in your name. Its footer links your result, so maintainers see you understood the change.',
  },
];

/** No goal yet: how every lesson is made, after the goal question. */
function HowALessonIsMade() {
  return (
    <section aria-labelledby="one-issue" className="flex flex-col gap-3 rounded-xl border bg-card p-5">
      <h2 id="one-issue" className={HEADING.card}>
        Every lesson is made for one issue
      </h2>
      <ol className="flex flex-col gap-3">
        {HOW_A_LESSON_IS_MADE.map(({ Icon, title, text }) => (
          <li key={title} className="grid grid-cols-[2rem_minmax(0,1fr)] items-start gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand-soft-foreground">
              <Icon aria-hidden="true" className="size-4 shrink-0" />
            </span>
            <div className="flex flex-col gap-0.5">
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="border-t pt-3 text-sm text-muted-foreground">
        Want to see a lesson first? Once you pick a goal, practice lessons made for the same goal show here too. They’re
        optional.
      </p>
    </section>
  );
}

/**
 * The path to a first pull request, with the step the viewer is at. While their lesson waits for them, step 3 carries
 * the page's primary button to it (or the line while the pull request is opened) in its mark's place.
 */
function Path({ profile, attempts }: { profile: LearnProfile | null; attempts: MyLearnAttempts | undefined }) {
  const current = currentOf(attempts);
  const three = stepThreeOf(current);
  const action =
    three?.kind === 'link' ? (
      <Button asChild className="min-h-10 px-4 font-semibold max-sm:min-h-11 max-sm:w-full">
        <Link href={three.href} prefetch={false}>
          {three.label}
          <ArrowRight aria-hidden="true" />
        </Link>
      </Button>
    ) : three ? (
      <span role="status" className="text-sm font-medium text-muted-foreground">
        {three.text}
      </span>
    ) : null;
  const steps = pathStepsOf(current).map((step) => ({
    ...step,
    Icon: PATH_ICONS[step.key],
    action: step.key === 'pass' ? action : null,
  }));
  return (
    <section aria-labelledby="your-path" className="flex flex-col gap-2.5">
      <h2 id="your-path" className="text-sm font-semibold">
        Your path to a first pull request
      </h2>
      <StepStrip steps={steps} marks={pathMarksOf({ goal: hasGoal(profile), current })} />
    </section>
  );
}

/** "For your goal: TypeScript · Some · Change": the goal the list is for, and the way to change it. */
function GoalChips({ goal }: { goal: LearnGoalView }) {
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" data-goal-chips="">
      For your goal:
      <Pill tone="violet">{goalValueOf(goal)}</Pill>
      {goal.level ? <Pill tone="violet">{goal.level}</Pill> : null}
      <Link
        href={WORKSPACE_PATHS.settingsGoal}
        prefetch={false}
        className={`${link} max-sm:inline-flex max-sm:min-h-11 max-sm:items-center`}
      >
        Change
      </Link>
    </span>
  );
}

/** The issues' line, by the goal: a language's issues, or one project's. */
function issuesTextOf(goal: LearnGoalView | null): string {
  const value = goalValueOf(goal);
  const kind = goal?.kind.toLowerCase();
  const where =
    kind === 'language' && value
      ? `Open ${value} issues from projects that take outside pull requests.`
      : kind === 'project' && value
        ? `Open issues in ${value}.`
        : 'Open issues from projects that take outside pull requests.';
  return `${where} Your lesson is written for the issue you pick.`;
}

/** Learn something new (`#issues`): the heading, its line and the goal, then the list with its own notices. */
function LearnSomethingNew({
  issues,
  goal,
  held,
  primary,
}: {
  issues: LearnIssues | undefined;
  goal: LearnGoalView | null;
  held: boolean;
  primary: boolean;
}) {
  return (
    <section aria-labelledby="issues-title" id="issues" className="flex scroll-mt-24 flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="issues-title" className={HEADING.section}>
            Learn something new
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">{issuesTextOf(goal)}</p>
        </div>
        {goal && !held ? <GoalChips goal={goal} /> : null}
      </div>
      <LearnIssueList issues={issues} held={held} primary={primary} source="learn_home_issue" />
    </section>
  );
}

const PRACTICE_TEXT =
  'Other learners’ lessons for the same goal. They need no agent. Lessons you passed are not shown.';
const PRACTICE_WAIT_TEXT =
  'Other learners’ lessons for the same goal. They need no agent, and taking one doesn’t touch your own lesson.';

const Muted = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;

/** What the Learn tab reads for the viewer. A part left undefined is one the API did not answer (or was not read). */
export type LearnTabData = {
  state: LearnTabState;
  profile: LearnProfile | null;
  attempts: MyLearnAttempts | undefined;
  counts: LearnProgressCounts | undefined;
  issues?: LearnIssues;
  practice?: PracticeLessons;
  activity?: ContributeActivity | null;
  /** The viewer's own agent's name, for Right now's lane. */
  agentName?: string | null;
};

/**
 * The Learn tab (`/learn`, signed in, Learn open): its head; the path to a first pull request (step 3 the link to a
 * lesson that waits) or, after the first Learn pull request, four numbers; Right now while the viewer's own agent works
 * on a lesson; then the state's own part: the goal question, the issues for the goal, practice lessons. Each state
 * ends in one next step.
 */
export function LearnTabScreen({
  state,
  profile,
  attempts,
  counts,
  issues,
  practice,
  activity,
  agentName,
}: LearnTabData) {
  const goal = issues?.goal ?? goalViewOf(profile);
  const goalText = goalValueOf(goal);
  const head = headPartOf({ counts, attempts });
  // Step 3's button is the page's primary while it shows; then no row is.
  const stepLink = head === 'path' && stepThreeOf(currentOf(attempts))?.kind === 'link';
  let content: ReactNode;
  switch (state.kind) {
    case 'setting-up':
      content = <LearnSettingUp />;
      break;
    case 'no-goal':
      content = (
        <>
          <LearnGoalQuick profile={profile} />
          <HowALessonIsMade />
        </>
      );
      break;
    case 'working':
    case 'lesson':
      content = (
        <>
          <PracticeSection
            practice={practice}
            goal={goalText}
            title={state.kind === 'working' ? 'Practice while you wait' : 'Practice lessons'}
            text={state.kind === 'working' ? PRACTICE_WAIT_TEXT : PRACTICE_TEXT}
          />
          <Muted>{ONE_AT_A_TIME}</Muted>
        </>
      );
      break;
    default:
      content = (
        <>
          <LearnSomethingNew issues={issues} goal={goal} held={state.kind === 'held'} primary={!stepLink} />
          <PracticeSection practice={practice} goal={goalText} title="Practice lessons" text={PRACTICE_TEXT} />
        </>
      );
  }
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 pt-7 pb-16" data-learn-tab={state.kind}>
      <div className="flex flex-col gap-4">
        <header className="flex flex-col gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h1 className={HEADING.page}>Learn</h1>
            <Link href={LEARN_ABOUT_PATH} prefetch={false} className={`${link} text-sm`}>
              How Learn works →
            </Link>
          </div>
          <p className="max-w-prose text-muted-foreground">
            Your agent fixes a real issue and writes a lesson about that exact fix, for what you want to learn. Pass it,
            and the pull request opens in your name.
          </p>
        </header>
        {head === 'tiles' && counts ? (
          <NumberTiles tiles={learnTilesOf(counts)} name="learn" />
        ) : head === 'path' ? (
          <Path profile={profile} attempts={attempts} />
        ) : null}
      </div>
      {state.kind === 'setting-up' ? null : (
        <RightNow activity={activity} side="learn" notes={{ own: { note: agentName ?? null } }} />
      )}
      {content}
      <nav aria-label="More about Learn" className="flex flex-wrap gap-x-5 gap-y-2 border-t pt-3 text-sm">
        <Link
          href={LEARN_MAINTAINERS_PATH}
          prefetch={false}
          className={`${link} max-sm:inline-flex max-sm:min-h-11 max-sm:items-center`}
        >
          Learn for maintainers
        </Link>
      </nav>
    </main>
  );
}
