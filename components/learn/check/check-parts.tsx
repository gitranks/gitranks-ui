'use client';

import { Check, ChevronDown, Minus } from 'lucide-react';
import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import { type KeyboardEvent, type ReactNode, type Ref, useId } from 'react';

import { LiveStatus } from '@/components/learn/player/live-status';
import { checkPlace } from '@/components/learn/player/places';
import { AnswerPart } from '@/components/learn/question/answer-part';
import type { LearnAnswer } from '@/components/learn/question/use-learn-answer';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/workspace/kbd';
import { type PlayerCrumb, PlayerRunEnd, PlayerStrip } from '@/components/workspace/player/player-strip';
import {
  type CheckQuestionShown,
  checkResultWordsOf,
  type GroupBox,
  groupBoxOf,
  groupWordsOf,
  type KnownGroup,
  type KnownLesson,
  knownTitleOf,
  type LearnCheckGroup,
  outcomePillOf,
  startWordsOf,
} from '@/lib/learn/check';
import type { LearnLessonLink } from '@/lib/learn/lesson-page';
import { coursePath, LEARN_HOME_PATH } from '@/lib/learn/paths';
import { cn } from '@/lib/utils';
import type { PlayerSquare } from '@/lib/workspace/player';

/*
 * The check's screens as page 17's boards draw them, from plain data: the strip, one question, the result with its
 * sheet of groups and its card, "What you know", and the pages with neither. The live page (`check-live.tsx`) moves
 * them; the catalogue draws each state from a fixture.
 */

/** Which screen: the check (its questions and result), or "What you know", opened from the course. */
export type CheckMode = 'check' | 'known';

/** The strip's way back: Learn, the course, then the check or "What you know". */
export const checkCrumbsOf = (course: LearnLessonLink, mode: CheckMode): PlayerCrumb[] => [
  { label: 'Learn', href: LEARN_HOME_PATH },
  { label: course.title, href: coursePath(course.slug) },
  { label: mode === 'known' ? 'What you know' : 'Check' },
];

/** The result's strip end: a square for each group, answered or not, and how many were answered. */
export function checkResultEndOf(result: readonly LearnCheckGroup[]) {
  const squares: PlayerSquare[] = result.map((group) => (group.outcome === 'NOT_ANSWERED' ? 'waiting' : 'answered'));
  return <PlayerRunEnd squares={squares} words={checkResultWordsOf(result.map((group) => group.outcome))} />;
}

/** The check's frame: the strip, then a column for a question or a message, or two for the sheet and its card. */
export function CheckFrame({
  course,
  mode,
  end,
  wide = false,
  children,
}: {
  course: LearnLessonLink;
  mode: CheckMode;
  end?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <PlayerStrip crumbs={checkCrumbsOf(course, mode)} end={end} />
      <main className="mx-auto w-full max-w-7xl px-4 pt-10 pb-16" data-check="">
        <div className={cn('mx-auto flex w-full flex-col gap-4', wide ? 'max-w-6xl' : 'max-w-[38rem]')}>{children}</div>
      </main>
    </>
  );
}

/** A page with one title, one sentence and its action: signing in, a read that failed, a check not offered. */
export function CheckMessage({
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
    <section className="flex flex-col items-start gap-3" data-check-state={state}>
      <h1 ref={titleRef} tabIndex={-1} className="m-0 text-2xl font-bold tracking-tight outline-none">
        {title}
      </h1>
      <p className="m-0 text-base text-muted-foreground">{text}</p>
      {children ? <div className="mt-2 flex flex-wrap items-center gap-3">{children}</div> : null}
    </section>
  );
}

/** While the run is on its way: the card's place, of its size, so nothing moves when it comes. */
export function CheckPending() {
  return (
    <div className="flex flex-col gap-4" data-check-state="pending">
      <LiveStatus className="sr-only" text="Loading your check…" />
      <div className="min-h-7" />
      <div className="h-80 animate-pulse rounded-xl border-2 bg-muted/40 motion-reduce:animate-none" />
    </div>
  );
}

/**
 * One question of the check: the group it stands for above the card, the card with no right or wrong, and "Stop and
 * see the result" at the end of the line of keys.
 */
export function CheckQuestionCard({
  asked,
  answer,
  last,
  hints,
  stopping = false,
  onStop,
}: {
  asked: CheckQuestionShown;
  answer: LearnAnswer;
  last: boolean;
  hints?: boolean;
  stopping?: boolean;
  onStop: () => void;
}) {
  return (
    <>
      <p className="m-0 flex min-h-7 items-center gap-1.5 text-sm text-muted-foreground">
        About <span className="font-medium text-foreground">{asked.group.title}</span>
      </p>
      <AnswerPart
        question={asked.question}
        answer={answer}
        place={checkPlace(last)}
        highlighted={asked.highlighted}
        hints={hints}
        keyLineEnd={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 text-muted-foreground"
            disabled={stopping}
            onClick={onStop}
            data-check-stop=""
          >
            Stop and see the result
          </Button>
        }
      />
    </>
  );
}

/** A box that is on, off, or partly on (a group with some of its lessons ticked). */
function Box({
  id,
  box,
  label,
  onChange,
}: {
  id?: string;
  box: 'on' | 'off' | 'mixed';
  label?: string;
  onChange: () => void;
}) {
  return (
    <CheckboxPrimitive.Root
      id={id}
      checked={box === 'on' ? true : box === 'mixed' ? 'indeterminate' : false}
      onCheckedChange={onChange}
      aria-label={label}
      className="peer grid size-5 shrink-0 place-content-center rounded-[4px] border border-input outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground"
    >
      <CheckboxPrimitive.Indicator className="grid place-content-center">
        {box === 'mixed' ? <Minus className="size-3.5" /> : <Check className="size-3.5" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

/** One lesson of an opened group: its box, or, learned, a check and "Learned". */
function LessonRow({
  lesson,
  ticked,
  onLesson,
}: {
  lesson: KnownLesson;
  ticked: boolean;
  onLesson: (lesson: KnownLesson) => void;
}) {
  const id = useId();
  if (lesson.learned) {
    return (
      <li className="flex min-h-11 items-center gap-3 px-3" data-known-lesson={lesson.slug} data-learned="">
        <Check className="size-5 shrink-0 text-positive" aria-hidden="true" />
        <span className="flex-1">{lesson.title}</span>
        <span className="text-sm text-positive">Learned</span>
      </li>
    );
  }
  return (
    <li className="flex min-h-11 items-center gap-3 px-3" data-known-lesson={lesson.slug}>
      <Box id={id} box={ticked ? 'on' : 'off'} onChange={() => onLesson(lesson)} />
      <label htmlFor={id} className={cn('flex-1 cursor-pointer py-2.5', !ticked && 'text-muted-foreground')}>
        {lesson.title}
      </label>
    </li>
  );
}

/** One group of the sheet: its box, name and count, how its question went, and its lessons when opened. */
function GroupRow({
  group,
  ticked,
  open,
  onGroup,
  onLesson,
  onOpen,
}: {
  group: KnownGroup;
  ticked: ReadonlySet<string>;
  open: boolean;
  onGroup: (group: KnownGroup) => void;
  onLesson: (lesson: KnownLesson) => void;
  onOpen: (group: KnownGroup, open: boolean) => void;
}) {
  const id = useId();
  const box: GroupBox = groupBoxOf(group, ticked);
  const pill = outcomePillOf(group.outcome);
  const words = groupWordsOf(group, ticked);
  // Esc in an opened group closes it, back on its button.
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    onOpen(group, false);
    document.getElementById(`${id}-toggle`)?.focus();
  };
  return (
    <li className="border-b last:border-b-0" data-known-group={group.slug} data-box={box}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
        {box === 'learned' ? (
          <Check className="size-5 shrink-0 text-positive" aria-hidden="true" />
        ) : (
          <Box box={box} label={`${group.title}: ${words}`} onChange={() => onGroup(group)} />
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-medium">{group.title}</span>
          <span className="text-sm text-muted-foreground" data-group-words="">
            {words}
          </span>
        </span>
        {pill ? (
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              pill.right ? 'bg-positive/10 text-positive' : 'border text-muted-foreground',
            )}
          >
            {pill.text}
          </span>
        ) : null}
        <Button
          id={`${id}-toggle`}
          type="button"
          variant="ghost"
          size="icon"
          className="size-11"
          aria-expanded={open}
          aria-controls={`${id}-lessons`}
          aria-label={`${open ? 'Hide' : 'Show'} the lessons of ${group.title}`}
          title={open ? 'Hide the lessons' : 'Show the lessons'}
          onClick={() => onOpen(group, !open)}
        >
          <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </Button>
      </div>
      {open ? (
        <ul
          id={`${id}-lessons`}
          className="m-0 mb-3 ms-8 list-none rounded-lg bg-muted/40 py-1"
          aria-label={`The lessons of ${group.title}`}
          onKeyDown={onKeyDown}
        >
          {group.lessons.map((lesson) => (
            <LessonRow key={lesson.slug} lesson={lesson} ticked={ticked.has(lesson.slug)} onLesson={onLesson} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** The sheet's list of groups, ticked from `ticked`, the opened ones from `opened`. */
export function KnownList({
  groups,
  ticked,
  opened,
  onGroup,
  onLesson,
  onOpen,
}: {
  groups: readonly KnownGroup[];
  ticked: ReadonlySet<string>;
  opened: ReadonlySet<string>;
  onGroup: (group: KnownGroup) => void;
  onLesson: (lesson: KnownLesson) => void;
  onOpen: (group: KnownGroup, open: boolean) => void;
}) {
  return (
    <ul className="m-0 list-none rounded-xl border px-4" aria-label="The groups of the course">
      {groups.map((group) => (
        <GroupRow
          key={group.slug}
          group={group}
          ticked={ticked}
          open={opened.has(group.slug)}
          onGroup={onGroup}
          onLesson={onLesson}
          onOpen={onOpen}
        />
      ))}
    </ul>
  );
}

/** One of the card's buttons: what it says, and what it does. */
export type CardAction = { label: string; act: () => void };

/**
 * The card beside the sheet: how many lessons are marked, where the person starts, what they changed on our guess,
 * what "Marked as known" means, and the buttons. While saving, the buttons wait; a save that failed says so.
 */
export function KnownCard({
  mode,
  counts,
  start,
  hand,
  primary,
  secondary,
  hints,
  saving = false,
  failed = false,
}: {
  mode: CheckMode;
  counts: { known: number; total: number; learned: number };
  start: LearnLessonLink | null;
  hand: string | null;
  primary: CardAction;
  secondary?: CardAction | null;
  hints: boolean;
  saving?: boolean;
  failed?: boolean;
}) {
  const startWords = startWordsOf(start, counts);
  return (
    <aside className="lg:sticky lg:top-6" aria-label={mode === 'known' ? 'What you know' : 'Your result'}>
      <section className="flex flex-col gap-3 rounded-xl border-2 border-primary p-5" data-known-card="">
        <p className="m-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {mode === 'known' ? 'What you know' : 'Your result'}
        </p>
        <h2 className="m-0 text-xl font-bold tracking-tight" aria-live="polite" data-known-title="">
          {knownTitleOf(counts)}
        </h2>
        <p className="m-0 text-sm" data-known-start="">
          {startWords ? (
            <>
              {startWords.before}
              <b className="font-semibold">{startWords.name}</b>
              {startWords.after}
            </>
          ) : (
            'There is no lesson left to start at.'
          )}
          {hand ? ` ${hand}` : null}
        </p>
        <p className="m-0 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <b className="font-semibold text-foreground">Marked as known</b> is not Learned. These lessons stay out of
          your daily review, and you can answer any of them later to learn it.
        </p>
        {failed ? (
          <p className="m-0 text-sm text-warning-soft-foreground" role="alert" data-known-failed="">
            <b className="font-semibold">Not saved.</b> Your marks did not reach us. Try again.
          </p>
        ) : null}
        <Button
          type="button"
          size="lg"
          className="min-h-11 w-full font-semibold"
          onClick={primary.act}
          disabled={saving}
          aria-busy={saving || undefined}
          data-known-primary=""
        >
          {saving ? 'Saving…' : primary.label}
          {hints && !saving ? <Kbd onPrimary>⏎</Kbd> : null}
        </Button>
        {secondary ? (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-11 w-full"
            onClick={secondary.act}
            disabled={saving}
            data-known-secondary=""
          >
            {secondary.label}
          </Button>
        ) : null}
      </section>
    </aside>
  );
}

/** The sheet's page: its title and words, the list, and the card beside it (under it on a phone). */
export function KnownSheet({
  title,
  intro,
  titleRef,
  list,
  card,
  state,
}: {
  title: string;
  intro: string;
  titleRef?: Ref<HTMLHeadingElement>;
  list: ReactNode;
  card: ReactNode;
  state: string;
}) {
  return (
    <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_27rem]" data-check-state={state}>
      <div className="flex min-w-0 flex-col gap-4">
        <h1 ref={titleRef} tabIndex={-1} className="m-0 text-xl font-bold tracking-tight outline-none sm:text-2xl">
          {title}
        </h1>
        <p className="m-0 text-base text-muted-foreground">{intro}</p>
        {list}
      </div>
      {card}
    </section>
  );
}
