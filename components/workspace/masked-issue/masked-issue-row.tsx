'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useInFlowExit } from '@/components/workspace/getting-in/flow-bookmark';
import {
  IssueHints,
  LessonLine,
  MaskedIssueFacts,
  type MaskedIssueLesson,
} from '@/components/workspace/masked-issue/facts';
import { RefChips } from '@/components/workspace/ref-chips';
import { cn } from '@/lib/utils';
import {
  HOLDING_NOTE,
  issuePagePath,
  limitNoteOf,
  SKIP_REASONS,
  starsTextOf,
  TAKEN_NOTE,
} from '@/lib/workspace/masked-issue';
import type { FullIssue, IssueLooksToday, IssueOutReason, MaskedIssue } from '@/lib/workspace/masked-issue.types';

/**
 * Where a masked row stands:
 * - `masked`: its facts, title and hints, with Skip and "See the full issue";
 * - `opening`: pressed, the button waits in its place;
 * - `taken`: someone pressed a moment before; "Show the next one";
 * - `limit`: no full issue left today, the button dimmed;
 * - `holding`: the person holds another issue, which this press gives back;
 * - `full`: the person holds this one: the project and the issue's chip over the same line of facts.
 */
export type MaskedRowState = 'masked' | 'opening' | 'taken' | 'limit' | 'holding' | 'full';

export type MaskedIssueRowProps = {
  issue: MaskedIssue;
  state?: MaskedRowState;
  /** With `full`: the issue as the person holds it. With `named`: the issue whose project the person named. */
  full?: FullIssue | null;
  /**
   * A row whose project the person named (their own stack, a project they contributed to): the project and the
   * issue's chip over the line of facts, and its own title, with the row's buttons as in every other state.
   */
  named?: boolean;
  /** The lesson it uses or teaches, when there is one. */
  lesson?: MaskedIssueLesson | null;
  /** With `limit`: the day's full issues, for the note. */
  looks?: Pick<IssueLooksToday, 'limit'> | null;
  /** A visitor's row: no Skip; the button leads to the sign-in. */
  visitor?: boolean;
  /** The viewer's own language colours. */
  colors?: Readonly<Record<string, string>>;
  /** The page of the issue; its mask id's page unless given. */
  href?: Route;
  /**
   * The button's words in place of "See the full issue" and, held in full, "Go to the issue" ("Start fixing it" for
   * the issue a person opened).
   */
  seeLabel?: string;
  /** False leaves Skip out (the issue a person opened is not one to skip). */
  skippable?: boolean;
  /** The press; without it the button is a link to the issue's page, where the press is made. */
  onSee?: () => void;
  /** A skip with its reason: the list puts the next issue in the row's place. */
  onSkip?: (reason: IssueOutReason) => void;
  /** "Show the next one", after someone else took it. */
  onNext?: () => void;
  /** The row asks why it is skipped from the start (the catalogue's state). */
  initialAsking?: boolean;
  /**
   * What the row says when its state changes (taken, the day's limit, holding another): for the list's one status
   * line under it, so a list has one live region, not one a row.
   */
  onStatus?: (text: string) => void;
};

const NOTE = 'min-h-4 text-xs text-foreground';

/**
 * One masked issue in a list, the same row on Learn and Contribute: the line of facts, the rewritten title, the lesson
 * when there is one, up to two hints; on the right Skip and "See the full issue". Every state keeps the row's height:
 * a note takes the hints' place, the button keeps its own. Skip asks why in the row's place, with two reasons and
 * "Keep it".
 */
export function MaskedIssueRow({
  issue,
  state = 'masked',
  full = null,
  named = false,
  lesson = null,
  looks = null,
  visitor = false,
  colors,
  href,
  seeLabel: given,
  skippable = true,
  onSee,
  onSkip,
  onNext,
  initialAsking = false,
  onStatus,
}: MaskedIssueRowProps) {
  const titleId = useId();
  // Inside a flow's way out, the press leaves the flow: marked for `FlowExit`.
  const leave = useInFlowExit() ? { 'data-flow-leave': '' } : {};
  const [asking, setAsking] = useState(initialAsking);
  const [skipped, setSkipped] = useState(false);
  const question = useRef<HTMLHeadingElement>(null);
  const done = useRef<HTMLParagraphElement>(null);
  const skipButton = useRef<HTMLButtonElement>(null);
  // After a press, the focus follows the question, or comes back to Skip.
  const focusNext = useRef<'question' | 'skip' | null>(null);
  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target === 'question' && asking) question.current?.focus();
    if (target === 'skip' && !asking) skipButton.current?.focus();
  }, [asking]);
  useEffect(() => {
    if (skipped) done.current?.focus();
  }, [skipped]);

  const page = href ?? issuePagePath(issue.id);
  const shown = (state === 'full' || named) && full ? full : null;

  const note =
    state === 'taken'
      ? TAKEN_NOTE
      : state === 'limit' && looks
        ? limitNoteOf(looks)
        : state === 'holding'
          ? HOLDING_NOTE
          : null;
  // A note that comes with a change of state is said once, through the list's status line; the first one is not.
  const saidNote = useRef(note);
  useEffect(() => {
    if (note === saidNote.current) return;
    saidNote.current = note;
    if (note) onStatus?.(note);
  }, [note, onStatus]);

  if (skipped) {
    // The focus moves here, which reads the line; nothing else announces it.
    return (
      <p ref={done} tabIndex={-1} className="px-4 py-3 text-sm text-muted-foreground outline-none sm:px-5">
        Skipped. It will not be shown to you again.
      </p>
    );
  }

  if (asking) {
    return (
      <article
        className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5"
        data-masked-row={issue.id}
        data-row-state="asking"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h3 ref={question} tabIndex={-1} className="m-0 text-sm font-semibold text-pretty outline-none">
            Why skip “{issue.title}”?
          </h3>
          <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0" aria-label="Why skip it">
            {SKIP_REASONS.map(({ reason, text }) => (
              <Button
                key={reason}
                type="button"
                variant="outline"
                className="h-9 rounded-full px-3.5"
                onClick={() => {
                  onSkip?.(reason);
                  setSkipped(true);
                }}
              >
                {text}
              </Button>
            ))}
          </fieldset>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="h-9 self-start px-3 sm:self-center"
          onClick={() => {
            focusNext.current = 'skip';
            setAsking(false);
          }}
        >
          Keep it
        </Button>
      </article>
    );
  }

  // A label the caller gives wins in every state but the press's wait ("Start fixing it" on the issue a person opened,
  // held in full or not).
  const seeLabel =
    state === 'opening' ? 'Opening…' : (given ?? (state === 'full' ? 'Go to the issue' : 'See the full issue'));
  const seeDisabled = state === 'opening' || state === 'limit';
  const seeClass = 'h-9 min-w-[9.5rem] px-4 max-sm:min-h-11';

  return (
    <article
      className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5"
      data-masked-row={issue.id}
      data-row-state={state}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {shown ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" data-full-line="">
            <RefChips repo={shown.repo} issue={shown.number} />
            {starsTextOf(shown.stars) ? <span>{starsTextOf(shown.stars)}</span> : null}
          </div>
        ) : null}
        <MaskedIssueFacts issue={issue} colors={colors} />
        <span id={titleId} className="font-semibold text-pretty text-foreground">
          {shown ? shown.title : issue.title}
        </span>
        {lesson ? <LessonLine lesson={lesson} /> : null}
        {note ? (
          <p className={cn(NOTE, 'm-0')} data-row-note="">
            {note}
          </p>
        ) : (
          <IssueHints hints={issue.hints} />
        )}
      </div>
      <div className="flex flex-none items-center gap-3 max-sm:[&>*:last-child]:flex-1">
        {state === 'taken' ? (
          <Button type="button" variant="outline" className={seeClass} onClick={onNext} aria-describedby={titleId}>
            Show the next one
          </Button>
        ) : (
          <>
            {visitor || !skippable || state === 'full' ? null : (
              <Button
                ref={skipButton}
                type="button"
                variant="ghost"
                className="h-9 px-3 text-muted-foreground max-sm:min-h-11"
                aria-label={`Skip “${issue.title}”`}
                onClick={() => {
                  focusNext.current = 'question';
                  setAsking(true);
                }}
              >
                Skip
              </Button>
            )}
            {onSee && state !== 'full' ? (
              <Button
                type="button"
                variant="outline"
                className={cn(seeClass, 'aria-disabled:opacity-50')}
                aria-disabled={seeDisabled || undefined}
                aria-describedby={titleId}
                onClick={seeDisabled ? undefined : onSee}
                {...leave}
              >
                {seeLabel}
              </Button>
            ) : seeDisabled ? (
              <Button
                type="button"
                variant="outline"
                className={cn(seeClass, 'opacity-50')}
                aria-disabled="true"
                aria-describedby={titleId}
              >
                {seeLabel}
              </Button>
            ) : (
              <Button asChild variant="outline" className={seeClass}>
                <Link href={page} prefetch={false} aria-describedby={titleId} {...leave}>
                  {seeLabel}
                </Link>
              </Button>
            )}
          </>
        )}
      </div>
    </article>
  );
}
