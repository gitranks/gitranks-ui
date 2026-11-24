'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { useCoursePageKeys } from '@/components/learn/course/use-course-keys';
import { CourseStats } from '@/components/learn/courses/course-card';
import { HomeIssuesEmail } from '@/components/learn/home/home-issues-email';
import { HomeRealIssues } from '@/components/learn/home/home-real-issues';
import { MyCourseCard } from '@/components/learn/my-progress/my-progress-parts';
import { PHONE_LINK } from '@/components/learn/phone-link';
import { Kbd } from '@/components/learn/question/kbd';
import { Button } from '@/components/ui/button';
import type { CourseSection, LearnCourseCard } from '@/lib/learn/course';
import {
  dueLineOf,
  dueTitleOf,
  firstReviewTitleOf,
  type HomeLessonBox,
  type HomeReviewBox,
  homeBoxesOf,
  isNewLearner,
  kindLabelOf,
  type LearnHomeRead,
  nextCourseLineOf,
  otherSectionsOf,
  SUGGESTED_REASON_WORDS,
  suggestedForOf,
  totalsLineOf,
} from '@/lib/learn/home';
import { LEARN_ABOUT_PATH, LEARN_EARLIER_PATH, LEARN_MAINTAINERS_PATH } from '@/lib/learn/learn-path';
import { learnTodayIn } from '@/lib/learn/my-progress';
import {
  coursePath,
  LEARN_COURSES_PATH,
  LEARN_ISSUES_PATH,
  LEARN_PROGRESS_PATH,
  LEARN_REVIEW_PATH,
  LEARN_SETUP_PATH,
  learnLessonPath,
} from '@/lib/learn/paths';
import {
  fixBoxIssuesLineOf,
  fixBoxWordsOf,
  type HomeFixState,
  type HomeReal,
  type HomeThirdBox,
  issuesBoxWordsOf,
  type LearnMergedFix,
  mergedBoxWordsOf,
  myFixPathOf,
  NO_ISSUES_BOX_WORDS,
} from '@/lib/learn/real-issues';
import type { LearnSetupRead } from '@/lib/learn/setup';
import { useKeyHints } from '@/lib/learn/use-key-hints';
import { cn } from '@/lib/utils';
import type { MaskedListReads } from '@/lib/workspace/masked-issue';

/*
 * Learn home (page 3): three boxes (the next lesson, the review, and real issues: the person's fix that needs them,
 * else their fix merged in the last 7 days, else a fix of theirs followed to its end, else the open issues that fit
 * them, else a quiet box with the email for a new one), the "Real issues" rows, the
 * courses the person started, the courses they have not, and the foot. A new learner picks a first course in the
 * boxes' place. The lit box takes Enter, the review R; a fix that needs the person takes the light from the others.
 */

/** Learn home has no search: the page's keys are Enter and R alone. */
const NO_SEARCH = { current: null };
const ignore = () => {};

const EYEBROW = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase';
const H2 = 'm-0 text-xl font-semibold';

/** A box: lit (it takes Enter), plain, or quiet (dashed, nothing to do). */
function Box({
  lit = false,
  quiet = false,
  kind,
  state,
  children,
}: {
  lit?: boolean;
  quiet?: boolean;
  /** The third box's kind (a fix of the person's, the open issues, or none open), and where its fix stands. */
  kind?: HomeThirdBox['kind'];
  state?: HomeFixState;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'flex min-h-[224px] min-w-0 flex-col gap-3 rounded-xl p-5',
        quiet ? 'border border-dashed' : 'bg-card',
        !quiet && (lit ? 'border-2 border-primary' : 'border'),
      )}
      data-lit={lit ? '' : undefined}
      data-quiet={quiet ? '' : undefined}
      data-third-box={kind}
      data-third-fix={state}
    >
      {children}
    </section>
  );
}

const Eyebrow = ({ children }: { children: ReactNode }) => <span className={EYEBROW}>{children}</span>;
const Title = ({ quiet = false, children }: { quiet?: boolean; children: ReactNode }) => (
  <h2 className={cn('m-0 text-lg font-semibold text-balance', quiet && 'text-muted-foreground')}>{children}</h2>
);
const Text = ({ children }: { children: ReactNode }) => <p className="m-0 text-sm text-muted-foreground">{children}</p>;

/**
 * A box's one action: the main one (Enter) when its box is lit, else an outline one. Its own key, when it has one, works
 * either way; its hint shows only when the box is not lit, where Enter's is.
 */
function Action({
  lit,
  hints,
  href,
  keyHint,
  children,
}: {
  lit: boolean;
  hints: boolean;
  href: string;
  keyHint?: string;
  children: ReactNode;
}) {
  const kbd = hints ? lit ? <Kbd onPrimary>⏎</Kbd> : keyHint ? <Kbd>{keyHint}</Kbd> : null : null;
  return (
    <Button
      asChild
      variant={lit ? 'default' : 'outline'}
      className={cn('mt-auto self-start max-sm:min-h-11', lit ? 'h-10 px-6 font-semibold' : 'h-9 px-4')}
    >
      <Link href={href as never} data-course-enter={lit ? '' : undefined} data-course-key={keyHint}>
        {children}
        {kbd}
      </Link>
    </Button>
  );
}

function LessonBox({ box, lit, hints }: { box: HomeLessonBox; lit: boolean; hints: boolean }) {
  switch (box.kind) {
    case 'next':
      return (
        <Box lit={lit}>
          <Eyebrow>Next for you</Eyebrow>
          <Title>{box.lesson.title}</Title>
          {box.course ? <Text>{box.course}</Text> : null}
          <Action lit={lit} hints={hints} href={learnLessonPath(box.lesson.slug)}>
            Start lesson
          </Action>
        </Box>
      );
    case 'next-course':
      return (
        <Box lit={lit}>
          <Eyebrow>Next for you</Eyebrow>
          <Title>Pick your next course</Title>
          <Text>{nextCourseLineOf(box)}</Text>
          <Action lit={lit} hints={hints} href={coursePath(box.course.slug)}>
            Open {box.course.title}
          </Action>
        </Box>
      );
    case 'pick':
      return (
        <Box lit={lit}>
          <Eyebrow>Start here</Eyebrow>
          <Title>Pick what to learn</Title>
          <Text>A topic or a language. You can change it at any time.</Text>
          <Action lit={lit} hints={hints} href={LEARN_COURSES_PATH}>
            See the courses
          </Action>
        </Box>
      );
    case 'all-done':
      return (
        <Box quiet>
          <Eyebrow>Next for you</Eyebrow>
          <Title quiet>You finished every course we have</Title>
          <Text>We are writing more. We email you when a new course is out.</Text>
        </Box>
      );
  }
}

function ReviewBox({ box, lit, hints }: { box: HomeReviewBox; lit: boolean; hints: boolean }) {
  switch (box.kind) {
    case 'due':
      return (
        <Box lit={lit}>
          <Eyebrow>Due now</Eyebrow>
          <Title>{dueTitleOf(box.due)}</Title>
          <Text>{dueLineOf(box)}</Text>
          <Action lit={lit} hints={hints} href={LEARN_REVIEW_PATH} keyHint="R">
            Review now
          </Action>
        </Box>
      );
    case 'done-today':
      return (
        <Box quiet>
          <Eyebrow>Review</Eyebrow>
          <Title quiet>Done for today</Title>
          <Text>
            You repeated {box.repeated} {box.repeated === 1 ? 'lesson' : 'lessons'}.{box.next ? ` ${box.next}` : null}
          </Text>
        </Box>
      );
    case 'first':
      return (
        <Box quiet>
          <Eyebrow>Review</Eyebrow>
          <Title quiet>{firstReviewTitleOf(box.days)}</Title>
          <Text>We ask you again about what you learned, so it stays. It takes about 2 minutes.</Text>
        </Box>
      );
    case 'none-learned':
      return (
        <Box quiet>
          <Eyebrow>Review</Eyebrow>
          <Title quiet>Reviews start after your first lesson</Title>
          <Text>We ask you again about what you learned, so it stays.</Text>
        </Box>
      );
    case 'nothing':
      return (
        <Box quiet>
          <Eyebrow>Review</Eyebrow>
          <Title quiet>Nothing to repeat today</Title>
          {box.next ? <Text>{box.next}</Text> : null}
        </Box>
      );
  }
}

/**
 * The person's fix merged in the last 7 days, as the board draws it: the lesson it made Mastered, and their Skills page.
 * Never lit: nothing waits on them.
 */
function MergedBox({ fix, hints, skillsHref }: { fix: LearnMergedFix; hints: boolean; skillsHref: string | null }) {
  const words = mergedBoxWordsOf(fix);
  return (
    <Box kind="merged">
      <Eyebrow>{words.eyebrow}</Eyebrow>
      <Title>{words.title}</Title>
      <Text>{words.text}</Text>
      {skillsHref ? (
        <Action lit={false} hints={hints} href={skillsHref}>
          {words.button}
        </Action>
      ) : null}
    </Box>
  );
}

/**
 * The third box, always there once its reads answer: the person's fix that needs them (lit, with the open issues a
 * quiet line under it); else their fix merged in the last 7 days; else a fix of theirs followed to its end; else the
 * open issues that fit them; else quiet, with the email for a new one. Its button names a page that exists: the fix's
 * own page, Issues, or the person's Skills page.
 */
function ThirdBox({
  box,
  lit,
  hints,
  skillsHref,
}: {
  box: HomeThirdBox;
  lit: boolean;
  hints: boolean;
  skillsHref: string | null;
}) {
  if (box.kind === 'fix') {
    const words = fixBoxWordsOf(box.row, box.state);
    const needsYou = box.state === 'needs-you';
    const issues = needsYou ? fixBoxIssuesLineOf(box.openIssues) : null;
    const href = words.button.to === 'fix' ? myFixPathOf(box.row) : skillsHref;
    return (
      <Box lit={lit} kind="fix" state={box.state}>
        {needsYou ? (
          <span className="self-start rounded-sm bg-brand-soft px-1.5 text-[11px] font-semibold tracking-wide text-brand-soft-foreground uppercase">
            {words.eyebrow}
          </span>
        ) : (
          <Eyebrow>{words.eyebrow}</Eyebrow>
        )}
        <Title>{words.title}</Title>
        <Text>{words.text}</Text>
        {issues ? (
          <p className="m-0 text-xs text-muted-foreground" data-third-box-issues="">
            {issues}
          </p>
        ) : null}
        {href ? (
          <Action lit={lit} hints={hints} href={href}>
            {words.button.label}
          </Action>
        ) : null}
      </Box>
    );
  }
  if (box.kind === 'merged') {
    return <MergedBox fix={box.fix} hints={hints} skillsHref={skillsHref} />;
  }
  if (box.kind === 'none') {
    return (
      <Box quiet kind="none">
        <Eyebrow>{NO_ISSUES_BOX_WORDS.eyebrow}</Eyebrow>
        <Title quiet>{NO_ISSUES_BOX_WORDS.title}</Title>
        <Text>{NO_ISSUES_BOX_WORDS.text}</Text>
        <HomeIssuesEmail on={box.emailOn} to={box.emailTo} />
      </Box>
    );
  }
  const words = issuesBoxWordsOf(box.count);
  return (
    <Box lit={lit} kind="issues">
      <Eyebrow>Fix a real issue</Eyebrow>
      <Title>{words.title}</Title>
      <Text>{words.text}</Text>
      <Action lit={lit} hints={hints} href={LEARN_ISSUES_PATH}>
        {words.button}
      </Action>
    </Box>
  );
}

/** One course of a column: its name, then its lessons and the numbers worth showing. */
function CourseRow({ course }: { course: LearnCourseCard }) {
  return (
    <li className="flex min-w-0 flex-col gap-0.5">
      <Link
        href={coursePath(course.slug)}
        className="truncate text-sm font-semibold hover:underline max-sm:min-h-11 max-sm:leading-11"
      >
        {course.name}
      </Link>
      <CourseStats course={course} mine={null} />
    </li>
  );
}

/**
 * Courses by kind, one column each, and each kind's line under its courses. `full`: the landing's titles ("Topics, in
 * any language"); else the short ones Learn home uses.
 */
export function CourseColumns({ sections, full = false }: { sections: readonly CourseSection[]; full?: boolean }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-course-columns="">
      {sections.map((section) => (
        <div key={section.kind} className="flex min-w-0 flex-col gap-3" data-course-column={section.kind}>
          <h3 className={cn(EYEBROW, 'm-0')}>
            {full ? section.title : section.kind === 'TOPIC' ? 'Topics' : 'Languages'}
          </h3>
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {section.courses.map((course) => (
              <CourseRow key={course.slug} course={course} />
            ))}
          </ul>
          <p className="m-0 text-xs text-muted-foreground">{section.sub}</p>
        </div>
      ))}
    </div>
  );
}

/** Other courses: the courses not started, by kind; left out when there are none. */
function OtherCourses({ home }: { home: LearnHomeRead }) {
  const sections = otherSectionsOf(home);
  if (!sections.length) return null;
  return (
    <section className="flex flex-col gap-4" aria-labelledby="other-courses" data-home-section="other">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="other-courses" className={H2}>
          Other courses
        </h2>
        <Link href={LEARN_COURSES_PATH} className={cn('text-sm font-semibold text-link hover:underline', PHONE_LINK)}>
          All courses
        </Link>
      </div>
      <CourseColumns sections={sections} />
    </section>
  );
}

/** Your courses: the totals, a card for each course started, and a card to add one. */
function YourCourses({ home, today }: { home: LearnHomeRead; today: string }) {
  if (!home.courses.length) return null;
  const totals = totalsLineOf(home);
  return (
    <section className="flex flex-col gap-4" aria-labelledby="your-courses" data-home-section="yours">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="your-courses" className={H2}>
            Your courses
          </h2>
          {totals ? (
            <span className="text-sm text-muted-foreground" data-home-totals="">
              {totals}
            </span>
          ) : null}
        </div>
        <Link href={LEARN_PROGRESS_PATH} className={cn('text-sm font-semibold text-link hover:underline', PHONE_LINK)}>
          Your progress
        </Link>
      </div>
      <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 lg:grid-cols-3" data-my-courses="">
        {home.courses.map((mine) => (
          <MyCourseCard key={mine.course.slug} mine={mine} today={today} />
        ))}
        <li className="flex min-w-0 flex-col gap-2 rounded-xl border border-dashed p-5" data-add-course="">
          <h3 className="m-0 text-lg font-semibold">Add a course</h3>
          <p className="m-0 text-sm text-muted-foreground">
            A topic or a language. You can follow as many as you like.
          </p>
          <Link
            href={LEARN_COURSES_PATH}
            className={cn('mt-auto self-start text-sm font-semibold text-link hover:underline', PHONE_LINK)}
          >
            See all courses →
          </Link>
        </li>
      </ul>
    </section>
  );
}

/** A new learner's first pick: the suggested courses, the first lit, in the boxes' place. */
function FirstCourse({
  home,
  setup,
  hints,
}: {
  home: LearnHomeRead;
  setup: Pick<LearnSetupRead, 'mainLanguage' | 'otherLanguages' | 'level'> | null;
  hints: boolean;
}) {
  const forWhom = suggestedForOf(setup);
  return (
    <section className="flex flex-col gap-4" data-home-first-course="">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-2xl font-semibold">Pick your first course</h1>
        {forWhom ? (
          <p className="m-0 text-sm text-muted-foreground">
            {forWhom} ·{' '}
            <Link href={LEARN_SETUP_PATH} className={cn('font-semibold text-link hover:underline', PHONE_LINK)}>
              Change
            </Link>
          </p>
        ) : null}
      </div>
      {home.suggested.length ? (
        <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-3" data-suggested="">
          {home.suggested.map(({ course, reason }, index) => (
            <li key={course.slug} className="min-w-0">
              <Box lit={index === 0}>
                {reason ? <Eyebrow>{SUGGESTED_REASON_WORDS[reason]}</Eyebrow> : null}
                <span className="self-start rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                  {kindLabelOf(course)}
                </span>
                <Title>{course.name}</Title>
                {course.covers ? <Text>{course.covers}</Text> : null}
                <CourseStats course={course} mine={null} />
                <Action lit={index === 0} hints={hints} href={coursePath(course.slug)}>
                  Start this course
                </Action>
              </Box>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-sm text-muted-foreground">
          <Link href={LEARN_COURSES_PATH} className={cn('font-semibold text-link hover:underline', PHONE_LINK)}>
            See all courses
          </Link>{' '}
          and start the one you like.
        </p>
      )}
    </section>
  );
}

/** The foot: how Learn works, the page for maintainers, and the way Learn worked before its courses. */
export function LearnHomeFoot() {
  const link = cn('font-semibold text-link hover:underline', PHONE_LINK);
  return (
    <footer
      className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-6 text-sm text-muted-foreground"
      data-home-foot=""
    >
      <Link href={LEARN_ABOUT_PATH} className={link}>
        How Learn works
      </Link>
      <span aria-hidden="true">·</span>
      <Link href={LEARN_MAINTAINERS_PATH} className={link}>
        For maintainers
      </Link>
      <span aria-hidden="true">·</span>
      <Link href={LEARN_EARLIER_PATH} prefetch={false} className={link}>
        Fix a real issue with your agent
      </Link>
    </footer>
  );
}

export type LearnHomeViewProps = {
  home: LearnHomeRead;
  setup: Pick<LearnSetupRead, 'mainLanguage' | 'otherLanguages' | 'level'> | null;
  /** The moment the page was drawn, and the zone the person's days are counted in (null: Learn's default). */
  now: string;
  timeZone: string | null;
  /** Key hints shown or not; the browser's answer when not given. */
  hints?: boolean;
  /** The third box and the "Real issues" rows; none while the API does not answer them (the page is then as before). */
  real?: HomeReal | null;
  /** What the masked rows need: the day's full issues, the numbers of a night. */
  reads?: MaskedListReads | null;
  /** The person's Skills page, which the box of a merged fix leads to; none, and that box has no button. */
  skillsHref?: string | null;
};

/** Learn home, as the person's answer says. */
export function LearnHomeView({
  home,
  setup,
  now,
  timeZone,
  hints: hintsGiven,
  real = null,
  reads = null,
  skillsHref = null,
}: LearnHomeViewProps) {
  const live = useKeyHints();
  const hints = hintsGiven ?? live;
  useCoursePageKeys({ inputRef: NO_SEARCH, onClear: ignore });
  const at = new Date(now);
  const today = learnTodayIn(at, timeZone);
  const fresh = isNewLearner(home);
  const boxes = homeBoxesOf(home, at, timeZone);
  // A fix that needs the person comes before everything else of the day; else the light stays where the day puts it
  // (the reviews due, else the next lesson). The open issues never take it.
  const third = real?.box ?? null;
  const highlight = third?.kind === 'fix' && third.state === 'needs-you' ? 'third' : boxes.highlight;
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pt-7 pb-16" data-learn-home="">
      {fresh ? (
        <FirstCourse home={home} setup={setup} hints={hints} />
      ) : (
        <>
          <h1 className="sr-only">Learn home</h1>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-home-boxes="">
            <LessonBox box={boxes.lesson} lit={highlight === 'lesson'} hints={hints} />
            <ReviewBox box={boxes.review} lit={highlight === 'review'} hints={hints} />
            {third ? <ThirdBox box={third} lit={highlight === 'third'} hints={hints} skillsHref={skillsHref} /> : null}
          </div>
        </>
      )}
      {real ? (
        <HomeRealIssues
          key={real.issues.map((row) => row.issue.id).join()}
          fixes={real.fixes}
          issues={real.issues}
          reads={reads}
          now={at}
        />
      ) : null}
      <YourCourses home={home} today={today} />
      <OtherCourses home={home} />
      <LearnHomeFoot />
    </main>
  );
}

/** Learn home when the person's answer could not be read: what happened, a way to try again, and the foot. */
export function LearnHomeError() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pt-7 pb-16" data-learn-home="error">
      <section className="flex flex-col items-start gap-3">
        <h1 className="m-0 text-2xl font-semibold">Learn home did not load</h1>
        <p className="m-0 text-muted-foreground">
          Your progress is safe; we could not read it just now. Try again in a minute.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button asChild className="min-h-11 px-5 font-semibold">
            <a href="/learn">Try again</a>
          </Button>
          <Link href={LEARN_COURSES_PATH} className={cn('text-sm font-semibold text-link hover:underline', PHONE_LINK)}>
            See all courses
          </Link>
        </div>
      </section>
      <LearnHomeFoot />
    </main>
  );
}
