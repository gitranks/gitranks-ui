import { Check } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode, Ref } from 'react';

import { reviewPlace } from '@/components/learn/player/places';
import { type PlayerCrumb, PlayerStrip } from '@/components/learn/player/player-strip';
import { AnswerPart } from '@/components/learn/question/answer-part';
import { Kbd } from '@/components/learn/question/kbd';
import type { LearnAnswer } from '@/components/learn/question/use-learn-answer';
import { Button } from '@/components/ui/button';
import type { LearnLessonLink } from '@/lib/learn/lesson-page';
import { coursePath, LEARN_HOME_PATH, learnLessonPath } from '@/lib/learn/paths';
import {
  type LearnReviewAnswered,
  nextReviewWordsOf,
  type ReviewDone,
  type ReviewItemShown,
  type ReviewNext,
  reviewChangeLineOf,
  reviewEndSummaryOf,
  reviewEndTitleOf,
  reviewMoreWordsOf,
  reviewPillsOf,
} from '@/lib/learn/review';
import { cn } from '@/lib/utils';

/*
 * The review's screens as page 16's boards draw them, from plain data: the strip, the card of one lesson before and
 * after its answer, the end, and the pages with nothing to repeat. The live page (`review-live.tsx`) moves them; the
 * catalogue draws each state from a fixture.
 */

/** The strip's way back: Learn, the course when the review was opened from one, the review. */
export const reviewCrumbsOf = (course: LearnLessonLink | null): PlayerCrumb[] => [
  { label: 'Learn', href: LEARN_HOME_PATH },
  ...(course ? [{ label: course.title, href: coursePath(course.slug) }] : []),
  { label: 'Review' },
];

/** The review's frame: the strip, then the column the card and the end sit in. */
export function ReviewFrame({
  course,
  end,
  children,
}: {
  course: LearnLessonLink | null;
  end?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <PlayerStrip crumbs={reviewCrumbsOf(course)} end={end} />
      <main className="mx-auto w-full max-w-7xl px-4 pt-10 pb-16" data-review="">
        <div className="mx-auto flex w-full max-w-[38rem] flex-col gap-4">{children}</div>
      </main>
    </>
  );
}

/** A page with one title, one sentence and its action: nothing due, signing in, or a read that failed. */
export function ReviewMessage({
  title,
  text,
  titleRef,
  children,
  state,
}: {
  title: string;
  text: string;
  titleRef?: Ref<HTMLHeadingElement>;
  children?: ReactNode;
  state: string;
}) {
  return (
    <section className="flex flex-col items-start gap-3" data-review-state={state}>
      <h1 ref={titleRef} tabIndex={-1} className="m-0 text-2xl font-bold tracking-tight outline-none">
        {title}
      </h1>
      <p className="m-0 text-base text-muted-foreground">{text}</p>
      {children ? <div className="mt-2 flex flex-wrap items-center gap-3">{children}</div> : null}
    </section>
  );
}

/** A visitor's page (an ended session): what the review is for, and the way to sign in. */
export function ReviewVisitor({ titleRef, onSignIn }: { titleRef?: Ref<HTMLHeadingElement>; onSignIn: () => void }) {
  return (
    <ReviewMessage
      state="visitor"
      titleRef={titleRef}
      title="The review needs an account"
      text="It brings back the lessons you learned, a few days later, so you keep them. Without an account there is nothing to bring back."
    >
      <Button type="button" size="lg" className="min-h-11 font-semibold" onClick={onSignIn}>
        Sign in with GitHub
      </Button>
    </ReviewMessage>
  );
}

/** A session whose review did not come: nothing is lost, and the way to read it again. */
export function ReviewFailed({ titleRef, onReload }: { titleRef?: Ref<HTMLHeadingElement>; onReload: () => void }) {
  return (
    <ReviewMessage
      state="failed"
      titleRef={titleRef}
      title="Your review did not load"
      text="Your progress is safe; we could not read it just now. Try again in a minute."
    >
      <Button type="button" size="lg" className="min-h-11 font-semibold" onClick={onReload}>
        Try again
      </Button>
    </ReviewMessage>
  );
}

/** Nothing due: when the next review is, with how many lessons, and the one next step. */
export function ReviewEmpty({
  nextReviewAt,
  nextReviewLessons,
  next,
  now,
  hints,
  titleRef,
}: {
  nextReviewAt: string | null;
  nextReviewLessons: number;
  next: ReviewNext | null;
  now: Date;
  hints: boolean;
  titleRef?: Ref<HTMLHeadingElement>;
}) {
  const action = nextActionOf(next);
  return (
    <ReviewMessage
      state="empty"
      titleRef={titleRef}
      title="Nothing is due today"
      text={nextReviewWordsOf(nextReviewAt, nextReviewLessons, now)}
    >
      <PrimaryLink href={action.href} hints={hints}>
        {action.label}
      </PrimaryLink>
    </ReviewMessage>
  );
}

/** While the person's review is on its way: the card's place, of its size, so nothing moves when it comes. */
export function ReviewPending() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" data-review-state="pending">
      <span className="sr-only" role="status">
        Loading your review…
      </span>
      <div className="min-h-7" />
      <div className="h-80 animate-pulse rounded-xl border-2 bg-muted/40 motion-reduce:animate-none" />
    </div>
  );
}

/** A link styled as a button, with the Enter hint where keys are used. */
export function PrimaryLink({ href, hints, children }: { href: Route; hints: boolean; children: ReactNode }) {
  return (
    <Button asChild size="lg" className="min-h-11 font-semibold">
      <Link href={href} data-review-primary="">
        {children}
        {hints ? <Kbd onPrimary>⏎</Kbd> : null}
      </Link>
    </Button>
  );
}

/** Where the next step goes, and its words: the next lesson, the next course, or Learn home. */
export function nextActionOf(next: ReviewNext | null): { href: Route; label: string } {
  if (next?.kind === 'lesson')
    return { href: learnLessonPath(next.link.slug), label: `Next lesson: ${next.link.title}` };
  if (next?.kind === 'course') return { href: coursePath(next.link.slug), label: `Next course: ${next.link.title}` };
  return { href: LEARN_HOME_PATH, label: 'Back to Learn home' };
}

/** Three dots for the three depths, as many filled as the lesson has now. */
function DepthDots({ depth }: { depth: 1 | 2 | 3 }) {
  return (
    <span role="img" aria-label={`Depth ${depth} of 3`} className="inline-flex shrink-0 items-center gap-1">
      {[1, 2, 3].map((dot) => (
        <span
          key={dot}
          className={cn('inline-block size-2 rounded-full', dot <= depth ? 'bg-primary' : 'border border-border')}
        />
      ))}
    </span>
  );
}

/** Under an answered card: what changed for the lesson, in the same place for every outcome. */
export function ReviewChangeLine({ reply, forgot }: { reply: LearnReviewAnswered; forgot: boolean }) {
  const line = reviewChangeLineOf(reply.change, forgot);
  return (
    <p className="m-0 flex min-h-9 items-center gap-2.5 text-sm" role="status" data-review-change={reply.change}>
      {line.depth ? <DepthDots depth={line.depth} /> : null}
      <span>
        <b className="font-semibold">{line.lead}</b> <span className="text-muted-foreground">{line.text}</span>
      </span>
    </p>
  );
}

/** Above the card: the course before the answer; the lesson, its course and the way to it once answered. */
function ReviewCardHead({ item, reply }: { item: ReviewItemShown; reply: LearnReviewAnswered | null }) {
  if (!reply) {
    return (
      <p className="m-0 flex min-h-7 items-center text-sm text-muted-foreground">A lesson from {item.course.title}</p>
    );
  }
  return (
    <p className="m-0 flex min-h-7 flex-wrap items-center gap-x-2 text-sm text-muted-foreground" data-review-lesson="">
      <Link href={learnLessonPath(reply.lesson.slug)} className="font-semibold text-foreground hover:underline">
        {reply.lesson.title}
      </Link>
      <span aria-hidden="true">·</span>
      <span>{item.course.title}</span>
      <span aria-hidden="true">·</span>
      <Link href={learnLessonPath(reply.lesson.slug)} className="text-link hover:underline">
        Open the lesson
      </Link>
    </p>
  );
}

/**
 * One lesson's card: the course above it, the question with its code, and once answered, the lesson's name and what
 * changed. `last` sets the button's words once answered.
 */
export function ReviewCard({
  item,
  answer,
  last,
  reply,
  forgot,
  hints,
}: {
  item: ReviewItemShown;
  answer: LearnAnswer;
  last: boolean;
  reply: LearnReviewAnswered | null;
  forgot: boolean;
  hints?: boolean;
}) {
  // Once answered, the card asks the call's question: the same one, with its key.
  const question = reply?.question ?? item.question;
  return (
    <>
      <ReviewCardHead item={item} reply={reply} />
      <AnswerPart
        question={question}
        answer={answer}
        place={reviewPlace(last)}
        highlighted={item.highlighted}
        hints={hints}
        below={reply ? <ReviewChangeLine reply={reply} forgot={forgot} /> : undefined}
      />
    </>
  );
}

const PILL: Record<'practised' | 'mastered' | 'muted' | 'back', string> = {
  practised: 'bg-brand-soft text-brand-soft-foreground',
  mastered: 'bg-primary text-primary-foreground',
  muted: 'border text-muted-foreground',
  back: 'bg-warning-soft text-warning-soft-foreground',
};

/** One lesson on the end's list: how it went, its name and course, and what changed. */
function DoneRow({ done }: { done: ReviewDone }) {
  const back = done.change === 'BACK_TOMORROW';
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b py-3 last:border-b-0">
      {back ? (
        <span className="inline-flex size-4 items-center justify-center" aria-hidden="true">
          <span className="size-2 rounded-full bg-warning" />
        </span>
      ) : (
        <Check className="size-4 text-positive" aria-hidden="true" />
      )}
      <span className="sr-only">{back ? 'Not this time:' : 'Right:'}</span>
      <Link href={learnLessonPath(done.lesson.slug)} className="font-medium hover:underline">
        {done.lesson.title}
      </Link>
      <span className="text-sm text-muted-foreground">{done.course.title}</span>
      <span className="ms-auto flex flex-wrap gap-1.5">
        {reviewPillsOf(done.change).map((pill) => (
          <span key={pill.text} className={cn('rounded-full px-2 py-0.5 text-xs font-medium', PILL[pill.tone])}>
            {pill.text}
          </span>
        ))}
      </span>
    </li>
  );
}

/**
 * The end: what was repeated, what changed for each lesson, and one next step. With more due than one sitting takes,
 * how many wait and the way to go on.
 */
export function ReviewEnd({
  done,
  more,
  next,
  hints,
  onMore,
  titleRef,
}: {
  done: readonly ReviewDone[];
  more: number;
  next: ReviewNext | null;
  hints: boolean;
  onMore: () => void;
  titleRef?: Ref<HTMLHeadingElement>;
}) {
  const action = nextActionOf(next);
  const summary = more > 0 ? reviewMoreWordsOf(more) : reviewEndSummaryOf(done);
  return (
    <section className="flex flex-col gap-4" data-review-state="end">
      <h1 ref={titleRef} tabIndex={-1} className="m-0 text-2xl font-bold tracking-tight outline-none">
        {reviewEndTitleOf(done.length, more)}
      </h1>
      {summary ? <p className="m-0 text-base text-muted-foreground">{summary}</p> : null}
      <ul className="m-0 list-none rounded-xl border px-4 py-1" aria-label="The lessons you repeated">
        {done.map((item, index) => (
          // A lesson is asked once a sitting: its place is its key.
          <DoneRow key={`${item.lesson.slug}-${index}`} done={item} />
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        {more > 0 ? (
          <>
            <Button type="button" size="lg" className="min-h-11 font-semibold" onClick={onMore} data-review-primary="">
              Repeat {Math.min(more, 10)} more
              {hints ? <Kbd onPrimary>⏎</Kbd> : null}
            </Button>
            <Button asChild variant="outline" size="lg" className="min-h-11">
              <Link href={LEARN_HOME_PATH}>Back to Learn home</Link>
            </Button>
          </>
        ) : (
          <PrimaryLink href={action.href} hints={hints}>
            {action.label}
          </PrimaryLink>
        )}
      </div>
    </section>
  );
}
