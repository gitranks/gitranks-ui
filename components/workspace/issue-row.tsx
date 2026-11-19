'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { type RefObject, useEffect, useRef, useState } from 'react';

import { Pill } from '@/components/pill/pill';
import { Button } from '@/components/ui/button';
import {
  GONE,
  type IssueLive,
  IssueLiveStatus,
  isGone,
  useFocusOnGone,
} from '@/components/workspace/issue-live-status';
import { IssueRowMenu } from '@/components/workspace/issue-row-menu';
import { LimitNotice } from '@/components/workspace/limit-notice';
import { IssueRepoRules } from '@/components/workspace/pull-request/issue-repo-rules';
import { RefChips } from '@/components/workspace/ref-chips';
import { StartControl, useHostedStart } from '@/components/workspace/start-control';
import { cn } from '@/lib/utils';
import { GOOD_FIRST_LABEL } from '@/lib/workspace/format';
import {
  type ConnectedAgents,
  type IssueRowIssue,
  type IssueRowSide,
  labelOf,
  sizeTextOf,
  startControlOf,
} from '@/lib/workspace/issue-row';
import type { IssueStartFacts, IssueStartRefusalCopy } from '@/lib/workspace/start-refusals';

const link = 'font-semibold text-link hover:underline';

/**
 * Why the row's hosted Start did not start: one sentence (or the limit's notice) and its one next step. It takes the
 * focus when it comes (`ref`, not in the tab order), so a keyboard or screen-reader user hears it where they were.
 */
function RowRefusal({
  refusal,
  sending,
  onRetry,
  ref,
}: {
  refusal: IssueStartRefusalCopy;
  sending: boolean;
  onRetry: () => void;
  ref: RefObject<HTMLDivElement | null>;
}) {
  const { action } = refusal;
  return (
    <div ref={ref} tabIndex={-1} data-start-refusal={refusal.code} className="text-sm text-foreground outline-none">
      {refusal.limit ? (
        <LimitNotice {...refusal.limit} />
      ) : (
        <p>
          {refusal.text}
          {action ? ' ' : null}
          {action && 'retry' in action ? (
            <Button
              type="button"
              variant="link"
              aria-disabled={sending || undefined}
              onClick={sending ? undefined : onRetry}
              className="h-auto p-0 font-semibold text-link aria-disabled:opacity-60"
            >
              {sending ? 'Trying again…' : action.label}
            </Button>
          ) : action?.external ? (
            <a href={action.href} className={link}>
              {action.label} →
            </a>
          ) : action ? (
            <Link href={action.href} prefetch={false} className={link}>
              {action.label} →
            </Link>
          ) : null}
        </p>
      )}
    </div>
  );
}

export type IssueRowProps = {
  issue: IssueRowIssue;
  side: IssueRowSide;
  /** The agents connected now (the gate's). */
  agents: ConnectedAgents;
  /** The first row's Start is the view's primary button. */
  primary?: boolean;
  /** No Start (the open pull request limit reached): the menu stays. */
  control?: boolean;
  /** The "⋯" (Contribute rows): false leaves it out, with Fix it and teach me and Skip. */
  menu?: boolean;
  /** Learn is open to the person: "Fix it and teach me" shows in the menu. */
  learnOpen?: boolean;
  /** Where the issue stands now, and what the row tells its list; none: nothing is followed (a visitor's list). */
  live?: IssueLive;
  /** A Learn row's Start a lesson, where the page that places the list sends it. */
  startHref?: Route;
  /** For a refused hosted Start's words: the run's cap, which way the key waits. */
  facts?: IssueStartFacts;
  /** A refused Start the row shows from the start (the catalogue's states). */
  initialRefusal?: IssueStartRefusalCopy | null;
  /**
   * Its hosted Start was refused: the page re-reads what the refusal changes (`LIMIT_REACHED`: the limit's state;
   * `REPO_UNAVAILABLE`: the list).
   */
  onRefused?: (refusal: IssueStartRefusalCopy) => void;
};

/**
 * One issue picked for the person, the same row on both front tabs: the repo and its Issue chip (GitHub), language and
 * size; the title as plain text (an issue has no page of ours before it is started); why it was picked; one label;
 * on Contribute rows the first-timers note and the repo's rules, closed. Then Start (`StartControl`) and, on
 * Contribute rows, the "⋯" menu. A hosted Start that is refused says why under the title; one that the issue is gone
 * for folds the row away as a taken row does.
 */
export function IssueRow({
  issue,
  side,
  agents,
  primary = false,
  control = true,
  menu = true,
  learnOpen = false,
  live,
  startHref,
  facts,
  initialRefusal = null,
  onRefused,
}: IssueRowProps) {
  const ref = { repo: issue.repo, issue: issue.number };
  const hosted = useHostedStart(issue.issueId, ref, { facts, initialRefusal, onRefused });
  const [skipped, setSkipped] = useState(false);
  const [takenHere, setTakenHere] = useState(false);
  const row = useRef<HTMLElement>(null);
  const line = useRef<HTMLParagraphElement>(null);
  const said = useRef<HTMLDivElement>(null);
  const done = useRef<HTMLParagraphElement>(null);
  const refusal = hosted.refusal;
  const folded = refusal?.row === 'folds';
  const status = live?.status && live.status !== 'AVAILABLE' ? live.status : takenHere ? 'TAKEN' : 'AVAILABLE';
  const gone = isGone(status) || folded;
  // A folded row's status line is its refusal, which says why.
  useFocusOnGone(gone, row, folded ? said : line);
  useEffect(() => {
    if (skipped) done.current?.focus();
  }, [skipped]);
  // A refusal that comes while the focus is in the row (or was let go): it moves to the refusal, which says it.
  const shownRefusal = useRef(initialRefusal);
  useEffect(() => {
    if (!refusal || refusal === shownRefusal.current) return;
    shownRefusal.current = refusal;
    const focus = document.activeElement;
    if (!focus || focus === document.body || row.current?.contains(focus)) said.current?.focus();
  }, [refusal]);
  // A Start refused because the issue is gone: the list lets the row go, once, without calling it taken.
  const fold = useRef(live?.onFold);
  fold.current = live?.onFold;
  const foldedOnce = useRef(false);
  useEffect(() => {
    if (!folded || foldedOnce.current) return;
    foldedOnce.current = true;
    fold.current?.();
  }, [folded]);

  const where = `${issue.repo} #${issue.number}`;
  if (skipped) {
    return (
      <p
        ref={done}
        role="status"
        tabIndex={-1}
        className="px-4 py-3 text-sm text-muted-foreground outline-none sm:px-5"
      >
        Skipped {where}. It will not be picked for you again.
      </p>
    );
  }

  const label = labelOf(issue.labels);
  const rest = issue.labels.filter((each) => each !== label);
  const why = issue.why?.trim();
  const size = sizeTextOf(issue.size);
  const showControl = control && !gone && refusal?.row !== 'no-control';
  const contribute = side === 'contribute';

  return (
    <article
      ref={row}
      data-issue={issue.issueId}
      data-side={side}
      data-gone={gone || undefined}
      {...(live ? { 'data-live-focus': '', tabIndex: -1 } : {})}
      className={cn(
        'flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start sm:px-5',
        live && 'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground', gone && GONE)}>
          <RefChips repo={issue.repo} issue={issue.number} />
          {issue.language ? <span>{issue.language}</span> : null}
          {size ? <span data-size={issue.size}>{size}</span> : null}
        </div>
        <span className={cn('font-semibold text-pretty text-foreground', gone && GONE)}>
          {issue.title?.trim() || `Issue #${issue.number}`}
        </span>
        {why || label ? (
          <div
            className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground', gone && GONE)}
          >
            {why ? (
              <span data-why="" className="min-w-0">
                <span className="sr-only">Why it was picked: </span>
                {why}
              </span>
            ) : null}
            {label ? (
              <span className="flex items-center gap-1" data-labels={issue.labels.length}>
                <Pill tone={GOOD_FIRST_LABEL.test(label) ? 'green' : 'neutral'}>{label}</Pill>
                {rest.length ? (
                  <span className="text-xs" title={rest.join(', ')}>
                    <span aria-hidden="true">+{rest.length}</span>
                    <span className="sr-only">, also labelled {rest.join(', ')}</span>
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
        ) : null}
        {contribute && issue.forNewcomers ? (
          <p data-first-timers="" className={cn('text-sm text-muted-foreground', gone && GONE)}>
            For first-time contributors: the maintainers keep it for people new to the project.
          </p>
        ) : null}
        {contribute ? <IssueRepoRules rules={issue.repoRules} className={cn(gone && GONE)} /> : null}
        {refusal ? <RowRefusal ref={said} refusal={refusal} sending={hosted.sending} onRetry={hosted.start} /> : null}
        {(live || takenHere) && !folded ? (
          <IssueLiveStatus ref={line} status={status} attemptId={live?.attemptId ?? null} />
        ) : null}
      </div>
      {showControl || (contribute && menu) ? (
        <div className="flex flex-none items-center gap-1 max-sm:[&>*:first-child]:flex-1">
          {showControl ? (
            <StartControl
              control={startControlOf(side, ref, agents, startHref)}
              primary={primary}
              sending={hosted.sending}
              disabled={hosted.blocked}
              onHosted={hosted.start}
              label={where}
            />
          ) : null}
          {contribute && menu ? (
            <IssueRowMenu
              issueId={issue.issueId}
              issueRef={ref}
              teach={learnOpen && showControl}
              disabled={gone}
              onSkipped={() => {
                setSkipped(true);
                live?.onSkipped?.();
              }}
              onTaken={() => {
                setTakenHere(true);
                live?.onTaken?.();
              }}
            />
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
