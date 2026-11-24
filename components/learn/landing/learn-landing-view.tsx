import Link from 'next/link';

import { type TryDrawn, TryLessonCard } from './try-lesson';
import { SQUARE_CLASS } from '@/components/learn/course/course-marks';
import { CourseColumns } from '@/components/learn/home/learn-home-view';
import { FixCard } from '@/components/learn/issues/issues-parts';
import { LearnSignInButton } from '@/components/learn/learn-sign-in';
import { PHONE_LINK } from '@/components/learn/phone-link';
import { QuestionsBlock } from '@/components/questions-block/questions-block';
import { buttonVariants } from '@/components/ui/button';
import { H2, MUTED_SECTION, WIDTH } from '@/components/workspace/getting-in/landing-parts';
import type { LearnCourseCard } from '@/lib/learn/course';
import type { LearnFixes } from '@/lib/learn/issues';
import {
  LANDING_GAINS,
  LANDING_MAINTAINERS_TEXT,
  LANDING_QUESTIONS,
  LANDING_STEPS,
  LANDING_TITLE,
  type LandingViewer,
  landingSectionsOf,
  landingTextOf,
  type TryLesson,
} from '@/lib/learn/landing';
import { LEARN_MAINTAINERS_PATH } from '@/lib/learn/learn-path';
import { LEARN_COURSES_PATH, LEARN_HOME_PATH, LEARN_LANDING_MARKDOWN_PATH, LEARN_SETUP_PATH } from '@/lib/learn/paths';
import { ALL_FIXES_PATH, landingFixesLineOf, landingFixesOf } from '@/lib/learn/real-issues';
import { cn } from '@/lib/utils';

/*
 * Learn's landing (page 4) at `/learn` for a visitor and for a signed-in person who has not set up Learn, and How
 * Learn works (page 31) at `/learn/about` for a learner: one page, its two buttons following who reads it.
 */

const EYEBROW = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase';
const START_CLASS = cn(buttonVariants({ size: 'lg' }), 'min-h-11 px-5 text-base font-semibold max-sm:w-full');

/** The page's one button, at the top and beside the questions: start learning, or back to Learn home. */
function StartButton({ viewer, className }: { viewer: LandingViewer; className?: string }) {
  const classes = cn(START_CLASS, className);
  if (viewer === 'visitor') {
    return (
      <LearnSignInButton redirectTo={LEARN_SETUP_PATH} className={classes}>
        Start learning
      </LearnSignInButton>
    );
  }
  return (
    <Link href={viewer === 'member' ? LEARN_SETUP_PATH : LEARN_HOME_PATH} className={classes} data-landing-start="">
      {viewer === 'member' ? 'Start learning' : 'Back to Learn home'}
    </Link>
  );
}

/** The line under the top button. */
const START_LINES: Record<LandingViewer, string | null> = {
  visitor: 'Free. You sign in with GitHub.',
  member: 'Free. Setting up takes a minute.',
  learner: null,
};

/**
 * "Real issues fixed with Learn": the three newest merged fixes, each in the name of who fixed it, with how many there
 * are from five. Left out with fewer than three. A fix's title is plain text until its own page is there. Plain, not
 * muted: the section after it is muted.
 */
function MergedFixes({ fixes }: { fixes: LearnFixes | null }) {
  const shown = landingFixesOf(fixes);
  if (!shown) return null;
  return (
    <section aria-labelledby="fixed-with-learn" data-landing-fixes="">
      <div className={cn(WIDTH, 'flex flex-col gap-7 py-11 sm:py-16')}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-col gap-2">
            <h2 id="fixed-with-learn" className={H2}>
              Real issues fixed with Learn
            </h2>
            <p className="m-0 max-w-prose text-muted-foreground">{landingFixesLineOf(shown.total)}</p>
          </div>
          <Link href={ALL_FIXES_PATH} className={cn('text-sm font-semibold text-link hover:underline', PHONE_LINK)}>
            All fixes
          </Link>
        </div>
        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
          {shown.rows.map((fix) => (
            <li key={`${fix.repo}#${fix.number}`} className="flex">
              <FixCard fix={fix} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** The footer every Learn pull request ends with, as a maintainer reads it. */
function FooterExample() {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm">
      <span className={EYEBROW}>At the end of the pull request</span>
      <p className="m-0 text-xs text-muted-foreground">
        Made with <span className="text-link">GitRanks Learn</span>, where developers learn on real issues · Claude Code
        (Opus) wrote this fix and taught it to @octocat, who passed a check on it and submitted it
        <br />
        Something off? <span className="text-link">Tell us or opt out in one step</span> - maintainers are always in
        control
      </p>
    </div>
  );
}

export type LearnLandingViewProps = {
  viewer: LandingViewer;
  /** Every live course, for the columns; none leaves the section out. */
  courses: readonly LearnCourseCard[];
  /** The lessons the top offers; none leaves the card out. */
  lessons: readonly TryLesson[];
  /** The newest merged fixes made with Learn; none (or fewer than three) leaves their section out. */
  fixes?: LearnFixes | null;
  /** A state of the lesson at the top, for the catalogue. */
  tryDrawn?: TryDrawn;
  hints?: boolean;
};

/** The landing, top to bottom. */
export function LearnLandingView({ viewer, courses, lessons, fixes = null, tryDrawn, hints }: LearnLandingViewProps) {
  const sections = landingSectionsOf(courses);
  return (
    <main className="flex flex-col" data-landing-viewer={viewer}>
      <section
        className={cn(
          WIDTH,
          'grid items-start gap-9 pt-8 pb-11 sm:pt-12 sm:pb-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] lg:gap-12',
        )}
      >
        <div className="flex min-w-0 flex-col gap-5 lg:pt-6">
          <div className="flex items-center gap-2">
            <span className="rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide text-brand-soft-foreground uppercase">
              New
            </span>
            <span className={EYEBROW}>GitRanks Learn</span>
          </div>
          <h1 className="m-0 text-4xl font-bold tracking-tight text-balance md:text-5xl">{LANDING_TITLE}</h1>
          <p className="m-0 text-lg text-foreground/80">{landingTextOf(courses)}</p>
          <div className="flex flex-wrap gap-3">
            <StartButton viewer={viewer} />
          </div>
          {START_LINES[viewer] ? <p className="m-0 text-sm text-muted-foreground">{START_LINES[viewer]}</p> : null}
        </div>
        {lessons.length ? <TryLessonCard lessons={lessons} viewer={viewer} drawn={tryDrawn} hints={hints} /> : null}
      </section>

      <section className={MUTED_SECTION} aria-labelledby="how-it-works">
        <div className={cn(WIDTH, 'flex flex-col gap-7 py-11 sm:py-16')}>
          <h2 id="how-it-works" className={H2}>
            How it works
          </h2>
          <ol className="m-0 grid list-none gap-6 p-0 md:grid-cols-3">
            {LANDING_STEPS.map((step, index) => (
              <li key={step.depth} className="flex flex-col gap-2 border-t-2 border-primary pt-3.5">
                <span className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                  <span className={cn('inline-block size-2.5 rounded-[3px]', SQUARE_CLASS[step.depth])} aria-hidden />
                  {step.label}
                </span>
                <h3 className="m-0 text-base font-semibold">{step.title}</h3>
                <p className="m-0 text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {sections.length ? (
        <section className={cn(WIDTH, 'flex flex-col gap-7 py-11 sm:py-16')} aria-labelledby="landing-courses">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="landing-courses" className={H2}>
              Courses
            </h2>
            <Link
              href={LEARN_COURSES_PATH}
              className={cn('text-sm font-semibold text-link hover:underline', PHONE_LINK)}
            >
              All courses
            </Link>
          </div>
          <CourseColumns sections={sections} full />
        </section>
      ) : null}
      <MergedFixes fixes={fixes} />

      <section className={MUTED_SECTION} aria-labelledby="what-you-get">
        <div className={cn(WIDTH, 'flex flex-col gap-7 py-11 sm:py-16')}>
          <h2 id="what-you-get" className={H2}>
            What you get
          </h2>
          <ul className="m-0 grid list-none gap-6 p-0 md:grid-cols-3">
            {LANDING_GAINS.map((gain) => (
              <li key={gain.title} className="flex flex-col gap-1.5">
                <h3 className="m-0 text-base font-semibold">{gain.title}</h3>
                <p className="m-0 text-sm text-muted-foreground">{gain.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        className={cn(
          WIDTH,
          'grid items-center gap-10 py-11 sm:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16',
        )}
      >
        <div className="flex min-w-0 flex-col gap-4">
          <h2 className={H2}>Honest with maintainers</h2>
          <p className="m-0 max-w-prose text-muted-foreground">{LANDING_MAINTAINERS_TEXT}</p>
          <Link
            href={LEARN_MAINTAINERS_PATH}
            className={cn('self-start font-semibold text-link hover:underline', PHONE_LINK)}
          >
            For maintainers →
          </Link>
        </div>
        <FooterExample />
      </section>

      <section className={MUTED_SECTION}>
        <div className={cn(WIDTH, 'flex flex-wrap gap-12 py-11 sm:py-16')}>
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5">
            <h2 className={H2}>Questions</h2>
            <StartButton viewer={viewer} className="self-start" />
          </div>
          <QuestionsBlock items={LANDING_QUESTIONS} className="flex min-w-0 flex-[2_1_560px] flex-col gap-5.5" />
        </div>
      </section>

      <footer className={cn(WIDTH, 'flex flex-wrap items-center gap-x-2 gap-y-1 py-8 text-sm text-muted-foreground')}>
        <span>Written and checked by GitRanks</span>
        <span aria-hidden="true">·</span>
        <a href={LEARN_LANDING_MARKDOWN_PATH} className={cn('font-semibold text-link hover:underline', PHONE_LINK)}>
          Markdown version
        </a>
        <span aria-hidden="true">·</span>
        <span>
          For agents:{' '}
          <a href="/llms.txt" className={cn('font-semibold text-link hover:underline', PHONE_LINK)}>
            llms.txt
          </a>
        </span>
      </footer>
    </main>
  );
}
