import Link from 'next/link';
import { notFound } from 'next/navigation';
import { type ReactNode, Suspense } from 'react';

import { ExampleLessonCard } from './example-lesson-card';
import { RecentLessons } from './recent-lessons';
import { LearnTab } from '@/app/(workspace)/learn/components/learn-tab-view';
import { QuestionsBlock } from '@/components/questions-block/questions-block';
import { buttonVariants } from '@/components/ui/button';
import { H2, MUTED_SECTION, WIDTH } from '@/components/workspace/getting-in/landing-parts';
import { ResumeLink } from '@/components/workspace/getting-in/resume-link';
import { loadLearnOpen, loadLearnProfile } from '@/lib/learn/learn.data';
import { learnFrontDoorOpenToVisitor } from '@/lib/learn/learn-front-door';
import { hasGoal } from '@/lib/learn/learn-home';
import { LEARN_MAINTAINERS_PATH, LEARN_PATH } from '@/lib/learn/learn-path';
import { readRecentLessons } from '@/lib/learn/recent-lessons.data';
import { cn } from '@/lib/utils';
import { contributeSource } from '@/lib/workspace/click-tracking';
import { viewerLogin } from '@/lib/workspace/contribute.data';
import type { WorkspaceGate } from '@/lib/workspace/gate';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { type LandingStart, learnResumeOf } from '@/lib/workspace/getting-in';
import { GETTING_IN_PATHS } from '@/lib/workspace/paths';

const HANDOFF = [
  {
    where: '01 · on gitranks.com',
    title: 'Tell us your goal',
    text: 'A language or one project, and your level. It takes a minute.',
  },
  {
    where: '02 · in your terminal',
    title: 'Your agent fixes an issue',
    text: 'One that fits your goal, from a project that takes outside pull requests. It writes the fix, the tests and your lesson.',
  },
  {
    where: '03 · on gitranks.com',
    title: 'You take the lesson',
    text: 'A few short steps, each with a picture or the code and one question. No essays: you tick the answer.',
  },
  {
    where: '04 · on gitranks.com',
    title: 'You approve the pull request',
    text: 'It opens from your fork, in your name, and says how it was made.',
  },
];

const PARTS = [
  { title: 'Before', text: 'What was wrong and how it showed.' },
  { title: 'Cause', text: 'Why it happened, in the code.' },
  { title: 'The fix', text: 'Every changed part and what it does.' },
  { title: 'How it connects', text: 'What else in the project the change touches.' },
  { title: 'Deep dive', text: 'One idea picked for your goal.' },
];

const QUESTIONS = [
  {
    question: 'Do I write the code?',
    answer: 'No. Your agent writes the fix. You learn what it did and why, then decide whether to submit it.',
  },
  {
    question: 'What if I answer wrong?',
    answer: 'Nothing bad. You get a hint and another question on the same step.',
  },
  {
    question: 'Does it cost anything?',
    answer: 'GitRanks Learn is free. Your agent uses the plan you already have.',
  },
  {
    question: 'How is it different from GitRanks Contribute?',
    answer: 'Same issues and the same review. Learn adds the lesson and the check before a pull request can go out.',
  },
];

const EYEBROW = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase';
const START_CLASS = cn(buttonVariants({ size: 'lg' }), 'min-h-11 px-5 text-base font-semibold max-sm:w-full');

/** A visitor's way in, the same for every visitor: Your goal (a bookmark may resume them further on). */
export const LEARN_VISITOR_START: LandingStart = { href: GETTING_IN_PATHS.learnGoal, signedIn: false };

/**
 * The front door's one button, in the hero and again beside the questions: Start learning, a plain link into Learn's
 * flow at `start.href` (swapped in the browser for this browser's step when that is where the person resumes), marked
 * `learn_landing`. For a member reading how Learn works: Open Learn, back to the Learn tab, unmarked (no start).
 */
function StartLearning({ start, className }: { start: LandingStart; className?: string }) {
  const classes = cn(START_CLASS, className);
  if ('member' in start) {
    return (
      <Link href={LEARN_PATH} prefetch={false} className={classes} data-landing-start="">
        Open Learn
      </Link>
    );
  }
  return (
    <ResumeLink
      side="learn"
      href={start.href}
      signedIn={start.signedIn}
      className={classes}
      data-landing-start=""
      {...contributeSource('learn_landing')}
    >
      Start learning
    </ResumeLink>
  );
}

/** The hero's example: one step of a lesson, with its diagram and its question to try. Static, from a fixed lesson. */
function ExampleLesson() {
  return (
    <figure id="lesson" aria-label="Example lesson" className="m-0 flex min-w-0 flex-[1_1_400px] scroll-mt-4 flex-col">
      <ExampleLessonCard />
    </figure>
  );
}

/** The footer every Learn pull request ends with, as a maintainer reads it. */
function FooterExample() {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm">
      <span className={EYEBROW}>At the end of the pull request</span>
      <p className="text-xs text-muted-foreground">
        Made with <span className="text-link">GitRanks Learn</span>, where developers learn on real issues · Claude Code
        (Opus) wrote this fix and taught it to @octocat, who passed a check on it and submitted it
        <br />
        Something off? <span className="text-link">Tell us or opt out in one step</span> — maintainers are always in
        control
      </p>
    </div>
  );
}

/**
 * Learn's front door: what a lesson is, with an example to try, the handoff between the terminal and the site, what
 * every lesson covers, the newest shared lessons (`recentLessons`, left out when not given), what maintainers see, and the
 * questions. Built from the same parts as Contribute's landing. A visitor and an account that has not entered read it at
 * `/learn`, anyone Learn is open to at `/learn/about`; only the one button's target changes (`start`).
 */
export function LearnLanding({ start, recentLessons }: { start: LandingStart; recentLessons?: ReactNode }) {
  const viewer = 'member' in start ? 'member' : start.signedIn ? 'signed-in' : 'visitor';
  return (
    <main className="flex flex-col" data-landing-viewer={viewer}>
      <section className={cn(WIDTH, 'flex flex-wrap items-center gap-9 pt-8 pb-11 sm:gap-14 sm:pt-14 sm:pb-16')}>
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-5">
          <div className="flex items-center gap-2">
            <span className="rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide text-brand-soft-foreground uppercase">
              New
            </span>
            <span className={EYEBROW}>GitRanks Learn</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-balance md:text-5xl">
            Learn from real open-source fixes
          </h1>
          <p className="max-w-xl text-lg text-foreground/80">
            Your coding agent fixes a real issue. You get a 10-minute lesson on what was wrong, why the fix works and
            how it fits the project. Pass the check, and the pull request opens in your name.
          </p>
          <div className="flex flex-wrap gap-3">
            <StartLearning start={start} />
          </div>
          <p className="text-sm text-muted-foreground">
            Free to use. Works with Claude Code, Codex, Cursor, Gemini CLI and other agents.
          </p>
        </div>
        <ExampleLesson />
      </section>

      <section className={MUTED_SECTION}>
        <div className={cn(WIDTH, 'flex flex-col gap-7 py-11 sm:py-16')}>
          <div className="flex flex-col gap-2">
            <h2 className={H2}>Two places, one handoff</h2>
            <p className="max-w-prose text-muted-foreground">
              The agent works in your terminal. You learn and approve on gitranks.com. You switch once, when the lesson
              is ready.
            </p>
          </div>
          <ol className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6">
            {HANDOFF.map(({ where, title, text }) => (
              <li key={where} className="flex flex-col gap-2 border-t-2 border-primary pt-3.5">
                <span className="font-mono text-xs text-muted-foreground">{where}</span>
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={cn(WIDTH, 'flex flex-col gap-7 py-11 sm:py-16')}>
        <div className="flex flex-col gap-2">
          <h2 className={H2}>What every lesson covers</h2>
          <p className="max-w-prose text-muted-foreground">The same five parts every time, written for your level.</p>
        </div>
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
          {PARTS.map(({ title, text }, index) => (
            <li key={title} className="flex flex-col gap-1.5 rounded-xl border bg-card p-4">
              <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {recentLessons}

      <section className={MUTED_SECTION}>
        <div
          className={cn(
            WIDTH,
            'grid items-center gap-10 py-11 sm:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16',
          )}
        >
          <div className="flex min-w-0 flex-col gap-4">
            <h2 className={H2}>Honest with maintainers</h2>
            <p className="max-w-prose text-muted-foreground">
              Every Learn pull request says an agent wrote the fix and that you studied it. Learn follows each
              project&apos;s rules on AI, and stays out of projects that ask it to.
            </p>
            <Link
              href={LEARN_MAINTAINERS_PATH}
              prefetch={false}
              className="self-start font-semibold text-link hover:underline"
            >
              For maintainers →
            </Link>
          </div>
          <FooterExample />
        </div>
      </section>

      <section className={cn(WIDTH, 'flex flex-wrap gap-12 py-11 sm:py-16')}>
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5">
          <h2 className={H2}>Questions</h2>
          <p className="text-muted-foreground">Ready? Tell us what you want to learn.</p>
          <StartLearning start={start} className="self-start" />
        </div>
        <QuestionsBlock items={QUESTIONS} className="flex min-w-0 flex-[2_1_560px] flex-col gap-5.5" />
      </section>
    </main>
  );
}

/** The front door's newest shared lessons, in their own Suspense: a slow read leaves the list out for a moment. */
export const recentLessonsSlot = () => (
  <Suspense fallback={null}>
    <LoadedRecentLessons />
  </Suspense>
);

/**
 * Where the front door's button leads an account Learn is open to: the step of Learn's flow that is left for one that
 * has not entered (§4.1: Pick an issue once a goal is saved, else Your goal), or Open Learn for one that has. Null for an
 * account being set up or with no profile, which the Learn tab speaks to.
 */
async function signedInStartOf(gate: WorkspaceGate): Promise<LandingStart | null> {
  if (gate.kind !== 'open') return null;
  if (gate.entered) return { member: true };
  return { href: learnResumeOf(hasGoal(await loadLearnProfile())), signedIn: true };
}

/**
 * `/learn`, behind Learn's gate: not found for anyone Learn is not open to. An account that has entered gets the Learn
 * tab, and so does one being set up (the tab says so); one that has not entered reads the front door, its button at the
 * step of the flow left for it. A visitor gets this far only once the API says Learn is open to everyone (the proxy
 * decides), and then reads the front door, its button at Your goal.
 */
export async function LearnHomeView() {
  if (await loadLearnOpen()) {
    const start = await signedInStartOf(await loadWorkspaceGate());
    if (!start || 'member' in start) return <LearnTab />;
    return <LearnLanding start={start} recentLessons={recentLessonsSlot()} />;
  }
  if (!(await viewerLogin()) && (await learnFrontDoorOpenToVisitor())) {
    return <LearnLanding start={LEARN_VISITOR_START} recentLessons={recentLessonsSlot()} />;
  }
  notFound();
}

/** `/learn/about`: how Learn works, for anyone Learn is open to; not found for anyone else. */
export async function LearnAboutView() {
  if (!(await loadLearnOpen())) notFound();
  const start = (await signedInStartOf(await loadWorkspaceGate())) ?? {
    href: GETTING_IN_PATHS.learnGoal,
    signedIn: true,
  };
  return <LearnLanding start={start} recentLessons={recentLessonsSlot()} />;
}

/** The front door's newest shared lessons, read once the page is open to its reader. */
async function LoadedRecentLessons() {
  return <RecentLessons lessons={await readRecentLessons()} />;
}
