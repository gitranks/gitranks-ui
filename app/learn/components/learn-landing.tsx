import Link from 'next/link';
import { FaGithub } from 'react-icons/fa';

import { Diagram } from './diagram';
import { ExampleQuestion } from './example-question';
import { LearnSignInButton } from './learn-sign-in';
import { H2, MUTED_SECTION, WIDTH } from '@/app/contribute/components/landing';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { EXAMPLE_LESSON } from '@/lib/learn/example-lesson';
import { LEARN_MAINTAINERS_PATH, LEARN_PROFILE_PATH } from '@/lib/learn/learn-path';
import { cn } from '@/lib/utils';

/** Who reads the front door: a visitor signs in first, a signed-in user goes straight to Goal and level. */
export type LearnLandingViewer = 'visitor' | 'signed-in';

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
    text: 'Five short steps, each with a picture or the code and one question. No essays: you tick the answer.',
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

/** "Start learning": a visitor's signs in first and comes back to Goal and level; a signed-in user's goes there. */
function StartLearning({ viewer, className }: { viewer: LearnLandingViewer; className?: string }) {
  const content = (
    <>
      <FaGithub aria-hidden="true" className="size-4 shrink-0" />
      Start learning
    </>
  );
  if (viewer === 'visitor') {
    return <LearnSignInButton className={cn(START_CLASS, className)}>{content}</LearnSignInButton>;
  }
  return (
    <Link href={LEARN_PROFILE_PATH} prefetch={false} className={cn(START_CLASS, className)}>
      {content}
    </Link>
  );
}

/** The hero's example: one step of a lesson, with its diagram and its question to try. Static, from a fixed lesson. */
function ExampleLesson() {
  const { subject, parts, part, title, diagram } = EXAMPLE_LESSON;
  return (
    <figure id="lesson" aria-label="Example lesson" className="m-0 flex min-w-0 flex-[1_1_400px] scroll-mt-4 flex-col">
      <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-4 py-3">
          <h2 className="flex items-baseline gap-2">
            <span className={EYEBROW}>Example lesson</span>{' '}
            <span className="text-sm text-muted-foreground">about 10 minutes</span>
          </h2>
          <span className="font-mono text-xs text-muted-foreground">{subject}</span>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <ul aria-label="The lesson's parts" className="flex flex-wrap gap-1.5">
            {parts.map((name) => (
              <li key={name}>
                <Badge
                  variant="outline"
                  className={cn(name === part && 'border-transparent bg-brand-soft text-brand-soft-foreground')}
                  aria-current={name === part ? 'step' : undefined}
                >
                  {name}
                </Badge>
              </li>
            ))}
          </ul>
          <span className="font-semibold text-foreground">{title}</span>
          <figure className="m-0 flex flex-col gap-2.5 rounded-lg border bg-muted/40 p-4">
            <Diagram id="learn-example" nodes={diagram.nodes} edges={diagram.edges} label={diagram.label} />
            <figcaption className="text-xs text-muted-foreground">
              Every step has a picture or the code, and a few lines of text.
            </figcaption>
          </figure>
        </div>
        <ExampleQuestion />
      </div>
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
 * every lesson covers, what maintainers see, and the questions. Built from the Contribute landing's sections. The same
 * page for a visitor and a signed-in user; only "Start learning" changes.
 */
export function LearnLanding({ viewer }: { viewer: LearnLandingViewer }) {
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
            <StartLearning viewer={viewer} />
            <a
              href="#lesson"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'lg' }),
                'min-h-11 px-5 text-base font-semibold max-sm:w-full',
              )}
            >
              See a lesson
            </a>
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
          <p className="text-muted-foreground">Ready? Set your goal and connect your agent.</p>
          <StartLearning viewer={viewer} className="self-start" />
        </div>
        <dl className="flex min-w-0 flex-[2_1_560px] flex-col gap-5.5">
          {QUESTIONS.map(({ question, answer }) => (
            <div key={question} className="flex flex-col gap-1">
              <dt className="font-semibold">{question}</dt>
              <dd className="text-muted-foreground">{answer}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
