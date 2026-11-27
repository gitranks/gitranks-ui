'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

import { Button } from '@/components/ui/button';
import { interviewCompanyPath, interviewLessonPath } from '@/lib/interviews/paths';
import {
  type BoxMark,
  type BoxNext,
  countWordsOf,
  daysWordsOf,
  type PlanBox as PlanBoxState,
  planSizeWordsOf,
  roundLessonsOf,
  STOP_REASON_WORDS,
  shortDayOf,
  startedTodayOf,
  startedWordsOf,
} from '@/lib/interviews/plan';
import { INTERVIEW_STOP_REASONS, type InterviewPlanPage, type InterviewStopReason } from '@/lib/interviews/types';
import { cn } from '@/lib/utils';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';

/*
 * The box "what to do now", under a plan's name. One frame in every state: a title with a few words on its right,
 * where the person stands, the action, one quiet line. "Stop this plan" is a quiet link in the last line of a plan in
 * progress; pressed, the same box asks why in place, and right after it says the plan is stopped and offers to start
 * it again.
 */

/** The line every box of a person's plan says. */
const PRIVATE = 'Your interview plans are not publicly visible.';

/** The words when a start or a stop did not go through. */
export const PLAN_SEND_FAILED = {
  start: 'It did not start. Try again in a moment.',
  stop: 'It was not stopped. Try again in a moment.',
} as const;

function Frame({
  kind,
  title,
  aside,
  children,
}: {
  kind: string;
  title: string;
  aside?: string | null;
  children: ReactNode;
}) {
  return (
    <section
      data-plan-box={kind}
      aria-label="What to do now"
      className="flex flex-col gap-3 rounded-xl border bg-card p-4.5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="m-0 text-base font-semibold">{title}</h2>
        {aside && <span className="text-sm text-muted-foreground">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

const Words = ({ children, strong = false }: { children: ReactNode; strong?: boolean }) => (
  <p className={cn('m-0 max-w-[62ch] text-sm', !strong && 'text-muted-foreground')}>{children}</p>
);

const Actions = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap items-center gap-3">{children}</div>
);

/** The quiet last line, with "Stop this plan" after it for a plan in progress. */
function Quiet({ children, onStop }: { children?: ReactNode; onStop?: () => void }) {
  return (
    <p data-plan-box-quiet className="m-0 text-xs text-muted-foreground">
      {children}
      {onStop && (
        <>
          {children && <span aria-hidden="true"> · </span>}
          <button
            type="button"
            onClick={onStop}
            className="whitespace-nowrap underline underline-offset-2 hover:text-foreground"
          >
            Stop this plan
          </button>
        </>
      )}
    </p>
  );
}

/** A failed start or stop, under the actions. */
const Failed = ({ children }: { children: ReactNode }) => (
  <p role="alert" className="m-0 text-sm text-destructive">
    {children}
  </p>
);

/** The main button of the box, as a link to a lesson or a page. */
const Main = ({ href, children }: { href: Route; children: ReactNode }) => (
  <Button asChild size="lg" className="font-semibold">
    <Link href={href}>{children}</Link>
  </Button>
);

/** The rounds as small marks: done filled, the round the person is in ringed, the rest muted. */
export function BoxMarks({ marks }: { marks: readonly BoxMark[] }) {
  return (
    <span data-plan-marks className="flex flex-wrap items-center gap-[5px]" aria-hidden="true">
      {marks.map((mark, index) => (
        <span
          key={index}
          data-plan-mark={mark}
          className="block h-3.5 w-7 rounded-[3px]"
          style={
            mark === 'done'
              ? { background: 'var(--brand-soft-foreground)' }
              : mark === 'here'
                ? { background: 'var(--brand-soft)', boxShadow: 'inset 0 0 0 2px var(--brand-soft-foreground)' }
                : { background: 'var(--muted)', boxShadow: 'inset 0 0 0 1px var(--border)' }
          }
        />
      ))}
    </span>
  );
}

const Where = ({ marks, children }: { marks: readonly BoxMark[]; children: ReactNode }) => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
    <BoxMarks marks={marks} />
    <span className="text-sm">{children}</span>
  </div>
);

/** The question of a stop, asked in place: what stopping does, five reasons that can be skipped, stop or keep going. */
function StopQuestion({
  onStop,
  onKeep,
}: {
  onStop: (reason: InterviewStopReason | null) => Promise<boolean>;
  onKeep: () => void;
}) {
  const [reason, setReason] = useState<InterviewStopReason | null>(null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <Frame kind="asking" title="Stop this plan?">
      <Words strong>
        It leaves your plans, here and in Learn. What you learned stays learned, and you can start the plan again at any
        time.
      </Words>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 p-0 text-sm font-medium">
          Why are you stopping? <span className="font-normal text-muted-foreground">You can skip this.</span>
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {INTERVIEW_STOP_REASONS.map((one) => (
            <label
              key={one}
              data-stop-reason={one}
              className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2 text-sm max-sm:min-h-11',
                reason === one && 'border-foreground',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
              )}
            >
              <input
                type="radio"
                name="stop-reason"
                value={one}
                checked={reason === one}
                onChange={() => setReason(one)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  'inline-flex size-4 shrink-0 items-center justify-center rounded-full border',
                  reason === one ? 'border-foreground' : 'border-muted-foreground',
                )}
              >
                {reason === one && <span className="size-2 rounded-full bg-foreground" />}
              </span>
              {STOP_REASON_WORDS[one]}
            </label>
          ))}
        </div>
      </fieldset>
      <Actions>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="font-semibold"
          disabled={sending}
          onClick={async () => {
            setSending(true);
            setFailed(false);
            const stopped = await onStop(reason);
            setSending(false);
            if (!stopped) setFailed(true);
          }}
        >
          Stop this plan
        </Button>
        <button type="button" onClick={onKeep} className="text-sm font-medium text-link hover:underline">
          Keep going
        </button>
      </Actions>
      {failed && <Failed>{PLAN_SEND_FAILED.stop}</Failed>}
    </Frame>
  );
}

/** A button that starts the plan (or signs in to start it), with its failure under it. */
function StartAction({
  label,
  outline = false,
  onPress,
}: {
  label: string;
  outline?: boolean;
  onPress: () => Promise<boolean>;
}) {
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      <Actions>
        <Button
          type="button"
          size="lg"
          variant={outline ? 'outline' : 'default'}
          className="font-semibold"
          disabled={sending}
          onClick={async () => {
            setSending(true);
            setFailed(false);
            const started = await onPress();
            setSending(false);
            if (!started) setFailed(true);
          }}
        >
          {label}
        </Button>
      </Actions>
      {failed && <Failed>{PLAN_SEND_FAILED.start}</Failed>}
    </>
  );
}

/** The next thing's link: the lesson to open, inside the plan. */
const nextHrefOf = (plan: InterviewPlanPage, next: BoxNext) =>
  interviewLessonPath(next.lesson, plan.company.slug, plan.slug);

export type PlanBoxProps = {
  plan: InterviewPlanPage;
  box: PlanBoxState;
  marks: readonly BoxMark[];
  /** Now, for "started today"; and the time zone days are said in (the browser's own when none). */
  now: Date;
  zone?: string;
  /** Signs in with GitHub, coming back to the plan to start it. */
  onSignIn: () => Promise<boolean>;
  /** Starts the plan (again); false when it did not go through. */
  onStart: () => Promise<boolean>;
  /** Stops the plan with the reason picked or none; false when it did not go through. */
  onStop: (reason: InterviewStopReason | null) => Promise<boolean>;
};

/** The box "what to do now", in the state the person's plan is in. */
export function PlanBox({ plan, box, marks, now, zone, onSignIn, onStart, onStop }: PlanBoxProps) {
  const [asking, setAsking] = useState(false);
  const size = planSizeWordsOf(plan);
  const stoppable = box.kind === 'progress' || box.kind === 'round';

  if (asking && stoppable) {
    return (
      <StopQuestion
        onKeep={() => setAsking(false)}
        onStop={async (reason) => {
          const stopped = await onStop(reason);
          if (stopped) setAsking(false);
          return stopped;
        }}
      />
    );
  }
  const askStop = () => setAsking(true);

  switch (box.kind) {
    case 'visitor':
      return (
        <Frame kind="visitor" title="Prepare for this interview" aside={size}>
          <Words>Follow the rounds in order. Lessons you learned before count at once.</Words>
          <StartAction label="Sign in with GitHub to start" onPress={onSignIn} />
          <Quiet>Free. {PRIVATE}</Quiet>
        </Frame>
      );
    case 'start':
      return (
        <Frame kind="start" title="Prepare for this interview" aside={size}>
          <Words>
            Follow the rounds in order.{' '}
            {box.learnedBefore > 0
              ? `You already learned ${box.learnedBefore} of these lessons.`
              : 'Lessons you learned before count at once.'}
          </Words>
          <StartAction label="Start this plan" onPress={onStart} />
          <Quiet>Free. {PRIVATE}</Quiet>
        </Frame>
      );
    case 'progress': {
      const { next } = box;
      const today = startedTodayOf(box.startedAt, now, zone);
      const learned =
        today && box.learnedBefore > 0
          ? `You already learned ${box.learnedBefore} of the ${plan.lessons} lessons.`
          : box.learned > 0
            ? `${box.learned} of ${plan.lessons} lessons learned.`
            : null;
      return (
        <Frame
          kind="progress"
          title={`You are on round ${box.here} of ${plan.roundCount}`}
          aside={startedWordsOf(box.startedAt, now, zone)}
        >
          <Where marks={marks}>
            {next ? (
              next.started ? (
                <>
                  Next:{' '}
                  <Link href={nextHrefOf(plan, next)} className="font-medium text-link hover:underline">
                    {next.item.type === 'lessons' ? `${next.item.course.name} · ${next.item.group.name}` : ''}
                  </Link>
                </>
              ) : (
                <>
                  Next:{' '}
                  <Link href={nextHrefOf(plan, next)} className="font-medium text-link hover:underline">
                    {next.item.type === 'lessons' ? next.item.group.name : ''}
                  </Link>
                  {countWordsOf(next.lessons, 'lesson', 'lessons') &&
                    `, ${countWordsOf(next.lessons, 'lesson', 'lessons')}`}
                </>
              )
            ) : null}
          </Where>
          {next && next.item.type === 'lessons' && (
            <Actions>
              <Main href={nextHrefOf(plan, next)}>
                {next.started ? `Continue with ${next.item.group.name}` : `Start with ${next.item.group.name}`}
              </Main>
            </Actions>
          )}
          <Quiet onStop={askStop}>
            {learned && `${learned} `}
            {PRIVATE}
          </Quiet>
        </Frame>
      );
    }
    case 'round': {
      const { done, next } = box;
      const upcoming = plan.rounds.find((round) => round.number === box.here);
      const learned = countWordsOf(roundLessonsOf(done), 'lesson learned', 'lessons learned');
      const startsWith =
        next && next.item.type === 'lessons'
          ? ` It starts with ${next.item.group.name}${next.lessons > 0 ? `, ${countWordsOf(next.lessons, 'lesson', 'lessons')}` : ''}.`
          : '';
      return (
        <Frame kind="round" title={`Round ${done.number} done: ${done.title}`} aside={learned}>
          <Where marks={marks}>
            Next: round {box.here}
            {upcoming ? `, ${upcoming.title}.` : '.'}
            {startsWith}
          </Where>
          {next && (
            <Actions>
              <Main href={nextHrefOf(plan, next)}>Start round {box.here}</Main>
            </Actions>
          )}
          <Quiet onStop={askStop}>{next ? 'The button opens the first lesson at once.' : null}</Quiet>
        </Frame>
      );
    }
    case 'finished': {
      const learned = countWordsOf(box.learned, 'lesson learned', 'lessons learned');
      return (
        <Frame kind="finished" title="You finished this plan" aside={daysWordsOf(box.startedAt, box.finishedAt, zone)}>
          <Where marks={marks}>
            {countWordsOf(plan.roundCount, 'round', 'rounds')}
            {learned ? `: ${learned}.` : '.'}
          </Where>
          {box.reviewDue && <Words>Lessons still come back in your review, so you remember them on the day.</Words>}
          <Actions>
            <Main href={WORKSPACE_PATHS.contribute}>Fix a real issue</Main>
            <Button asChild variant="outline" size="lg" className="font-semibold">
              <Link href={interviewCompanyPath(plan.company.slug)}>See other plans</Link>
            </Button>
          </Actions>
          <Quiet>A finished plan is preparation, not a promise. {PRIVATE}</Quiet>
        </Frame>
      );
    }
    case 'stopped':
      return (
        <Frame kind="stopped" title="You stopped this plan" aside={shortDayOf(box.stoppedAt, zone)}>
          <Words strong>
            It is no longer among your plans.
            {box.learned > 0 &&
              ` The ${countWordsOf(box.learned, 'lesson', 'lessons')} you learned in it ${box.learned === 1 ? 'stays' : 'stay'} learned.`}
          </Words>
          <StartAction label="Start this plan again" outline onPress={onStart} />
        </Frame>
      );
    default:
      return null;
  }
}
