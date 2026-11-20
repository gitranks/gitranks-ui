import { GitPullRequest, GraduationCap, type LucideIcon, Terminal } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { LearnGoalQuick } from './learn-goal-quick';
import { LearnSettingUp } from './learn-setting-up';
import { CHANGED_YOUR_MIND, OwnLessonCard, PullRequestCard } from './own-lesson-card';
import { PracticeSection } from './practice-lessons';
import { PATH_ICONS, StepStrip } from './stage-strip';
import { LearnIssuesSection } from '@/components/learn/learn-issues';
import { HEADING } from '@/components/workspace/primitives';
import {
  loadLearnIssues,
  loadLearnProfile,
  loadLearnSetup,
  loadMyLearnAttempts,
  loadPracticeLessons,
} from '@/lib/learn/learn.data';
import type { LearnGoalView, LearnIssues, LearnProfile, PracticeLessons } from '@/lib/learn/learn.types';
import {
  goalValueOf,
  goalViewOf,
  ISSUES_SHOWN,
  LEARN_PATH_STEPS,
  type LearnHomeState,
  learnHomeStateOf,
  PRACTICE_SHOWN,
  pathMarksOf,
} from '@/lib/learn/learn-home';
import { LEARN_ABOUT_PATH, LEARN_MAINTAINERS_PATH, LEARN_PROFILE_PATH } from '@/lib/learn/learn-path';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

/** Learn home's container, as Learn's other pages draw theirs. */
const MAIN = 'mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pt-7 pb-16';

const PATH_STEPS = LEARN_PATH_STEPS.map((step) => ({ ...step, Icon: PATH_ICONS[step.key] }));

/** Below the lists while the viewer's own lesson is in progress. */
export const ONE_AT_A_TIME = 'One lesson of your own at a time. More issues show here once this one is done.';

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

/** The header every state starts with, and the path to a first pull request with the step the viewer is at. */
function HomeHeader({ state }: { state: LearnHomeState }) {
  return (
    <>
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide text-brand-soft-foreground uppercase">
            New
          </span>
          <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">GitRanks Learn</span>
        </div>
        <h1 className={HEADING.page}>Learn from real open-source fixes</h1>
        <p className="max-w-prose text-foreground/80">
          Your agent fixes a real issue and writes a lesson about that exact fix, for what you want to learn. Pass it,
          and the pull request opens in your name.
        </p>
      </header>
      <section aria-labelledby="your-path" className="flex flex-col gap-2.5">
        <h2 id="your-path" className="text-sm font-semibold">
          Your path to a first pull request
        </h2>
        <StepStrip steps={PATH_STEPS} marks={pathMarksOf(state)} />
      </section>
    </>
  );
}

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
 * The links under every state: how Learn works, the page for maintainers, Your progress, and the goal and level.
 */
const FOOTER_LINK = 'font-semibold text-link hover:underline max-sm:inline-flex max-sm:min-h-11 max-sm:items-center';

function HomeFooter() {
  return (
    <nav aria-label="More about Learn" className="flex flex-wrap gap-x-5 gap-y-2 border-t pt-3 text-sm">
      <Link href={LEARN_ABOUT_PATH} prefetch={false} className={FOOTER_LINK}>
        How Learn works
      </Link>
      <Link href={LEARN_MAINTAINERS_PATH} prefetch={false} className={FOOTER_LINK}>
        Learn for maintainers
      </Link>
      <Link href={WORKSPACE_PATHS.progress} prefetch={false} className={FOOTER_LINK}>
        Your progress
      </Link>
      <Link href={LEARN_PROFILE_PATH} prefetch={false} className={FOOTER_LINK}>
        Goal and level
      </Link>
    </nav>
  );
}

/** The issues' line, by the goal: a language's issues, or one project's. */
function issuesTextOf(goal: LearnGoalView | null): string {
  const value = goalValueOf(goal);
  const where =
    goal?.kind.toLowerCase() === 'language' && value
      ? `Open ${value} issues from projects that take outside pull requests.`
      : goal?.kind.toLowerCase() === 'project' && value
        ? `Open issues in ${value}.`
        : 'Open issues from projects that take outside pull requests.';
  return `${where} Your lesson is written for the issue you pick.`;
}

const Muted = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;

/** What Learn home reads for the viewer: their state, goal, issues and practice lessons. */
export type LearnHomeData = {
  state: LearnHomeState;
  profile: LearnProfile | null;
  /** Read for the states with the issues; undefined when the API did not answer. */
  issues?: LearnIssues;
  /** Read for the states with practice; undefined when the API did not answer. */
  practice?: PracticeLessons;
  now?: Date;
};

/**
 * Learn home (`/learn`, signed in): the header, the path to a first pull request, then the state's own part: the goal
 * question, the own lesson's card, the pull request's card, the issues for the goal, practice lessons. Each state ends
 * in one next step. Links to how Learn works, the page for maintainers and Your progress close it.
 */
export function LearnHomeScreen({ state, profile, issues, practice, now }: LearnHomeData) {
  const goal = issues?.goal ?? goalViewOf(profile);
  const goalText = goalValueOf(goal);
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
    case 'own': {
      const { card, attempt } = state;
      const withPractice = card === 'working' || card === 'ready';
      const own = card !== 'approve' && card !== 'submitting';
      content = (
        <>
          <OwnLessonCard attempt={attempt} card={card} now={now} />
          {card === 'working' ? <Muted>{CHANGED_YOUR_MIND}</Muted> : null}
          {withPractice ? (
            <PracticeSection
              practice={practice}
              goal={goalText}
              title={card === 'working' ? 'While you wait: practice, if you like' : 'Practice, optional'}
              text="Optional. Each was written for another learner with the same goal, and needs no agent. Taking one doesn’t touch your own lesson."
            />
          ) : null}
          {own ? <Muted>{ONE_AT_A_TIME}</Muted> : null}
        </>
      );
      break;
    }
    case 'pull-request':
      content = (
        <>
          <PullRequestCard attempt={state.attempt} />
          <LearnIssuesSection
            issues={issues}
            goal={goal}
            title="Your next lesson"
            text="Pick an issue, and your agent starts on it."
            first="Start the next one"
          />
          <PracticeSection
            practice={practice}
            goal={goalText}
            title="Practice, optional"
            text="Other learners’ lessons for the same goal. Lessons you passed are not shown."
          />
        </>
      );
      break;
    default:
      content = (
        <>
          <LearnIssuesSection
            issues={issues}
            goal={goal}
            title="Pick an issue for your lesson"
            text={issuesTextOf(goal)}
            first="Start with my agent"
          />
          <PracticeSection
            practice={practice}
            goal={goalText}
            title="Practice first? Optional"
            text="See how a lesson works on a finished fix before your own. Each was written for another learner with the same goal, and needs no agent."
          />
        </>
      );
  }
  return (
    <main className={MAIN} data-learn-home={state.kind} data-own-card={state.kind === 'own' ? state.card : undefined}>
      <HomeHeader state={state} />
      {content}
      <HomeFooter />
    </main>
  );
}

/** Learn home's reads, by the state: the issues and practice lessons only where the state shows them. */
export async function LearnHomeSignedIn() {
  const [settingUp, attempts] = await Promise.all([loadLearnSetup(), loadMyLearnAttempts()]);
  // A new account's profile cannot be read yet: its setup line stands for everything else.
  const profile = settingUp ? null : await loadLearnProfile();
  const state = learnHomeStateOf({ settingUp, profile, attempts });
  // With the viewer's attempts unread, a lesson of theirs may be in progress: no issue is read (none revealed), and the
  // list says it couldn't load.
  const listed = (state.kind === 'goal-set' || state.kind === 'pull-request') && attempts !== undefined;
  const practiced =
    state.kind === 'goal-set' ||
    state.kind === 'pull-request' ||
    (state.kind === 'own' && (state.card === 'working' || state.card === 'ready'));
  const [issues, practice] = await Promise.all([
    listed ? loadLearnIssues(ISSUES_SHOWN) : undefined,
    practiced ? loadPracticeLessons(PRACTICE_SHOWN) : undefined,
  ]);
  return <LearnHomeScreen state={state} profile={profile} issues={issues} practice={practice} />;
}
