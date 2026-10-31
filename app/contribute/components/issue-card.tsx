'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { skipIssue } from '../actions';
import { ConfirmDialog } from './confirm-dialog';
import { GONE, type IssueLive, IssueLiveStatus, isGone, useFocusOnGone } from './issue-live-status';
import { Pill } from './primitives';
import { Button } from '@/components/ui/button';
import { githubUrlOf } from '@/lib/contribute/attempt-format';
import type { ContributeIssue } from '@/lib/contribute/contribute.types';
import { GOOD_FIRST_LABEL, LANGUAGES, SIZES } from '@/lib/contribute/format';
import { skipOutcomeOf } from '@/lib/contribute/live-issues';
import { cn } from '@/lib/utils';

/** The one GitHub label shown: a beginner-friendly one where there is one, else the first. */
const labelOf = (labels: string[]) => labels.find((label) => GOOD_FIRST_LABEL.test(label)) ?? labels[0];

/**
 * One issue picked for the user, as a row of the Issues list: where and how big, what, why it was picked, and Skip,
 * which asks first. One GitHub label is shown, and the count of the rest. `other` marks an issue from outside the
 * user's own list. `live`: where the issue stands now; once it is taken (or the user's own agent is on it) the card
 * says so, dimmed, its link and Skip off.
 */
export function IssueCard({
  issue,
  other = false,
  live,
}: {
  issue: ContributeIssue;
  other?: boolean;
  live?: IssueLive;
}) {
  const [confirming, setConfirming] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [takenHere, setTakenHere] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const done = useRef<HTMLParagraphElement>(null);
  const card = useRef<HTMLElement>(null);
  const line = useRef<HTMLParagraphElement>(null);
  const status = live?.status && live.status !== 'AVAILABLE' ? live.status : takenHere ? 'TAKEN' : 'AVAILABLE';
  const gone = isGone(status);
  const goneNow = useRef(gone);
  goneNow.current = gone;
  // The row and its dialog are gone once it is skipped: the focus goes to the line that says so.
  useEffect(() => {
    if (skipped) done.current?.focus();
  }, [skipped]);
  useFocusOnGone(gone, card, line);
  // Taken while its confirm is open: the dialog closes, nothing left to confirm.
  useEffect(() => {
    if (gone) setConfirming(false);
  }, [gone]);

  const skip = () =>
    startTransition(async () => {
      setError(null);
      const outcome = skipOutcomeOf(await skipIssue(issue.issueId));
      if (outcome.kind === 'taken') {
        // Not an error to show: the issue went to someone meanwhile, and the card says so.
        goneNow.current = true;
        setConfirming(false);
        setTakenHere(true);
        live?.onTaken?.();
        return;
      }
      if (outcome.kind === 'failed') {
        setError(outcome.message);
        return;
      }
      setConfirming(false);
      setSkipped(true);
      live?.onSkipped?.();
    });

  const where = `${issue.nameWithOwner} #${issue.number}`;
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

  const title = issue.title?.trim() || `Issue #${issue.number}`;
  const url = githubUrlOf(issue.url);
  const label = labelOf(issue.labels);
  const rest = issue.labels.filter((each) => each !== label);
  const why = issue.why?.trim();

  return (
    <article
      ref={card}
      data-issue={issue.issueId}
      data-other={other || undefined}
      data-gone={gone || undefined}
      {...(live ? { 'data-live-focus': '', tabIndex: -1 } : {})}
      className={cn(
        'flex items-start gap-3 px-4 py-3.5 sm:px-5',
        live && 'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-inset',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          className={cn('flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground', gone && GONE)}
        >
          <span className="font-mono break-all text-foreground/80">
            {issue.nameWithOwner} · #{issue.number}
          </span>
          {issue.language ? <span>{LANGUAGES[issue.language]}</span> : null}
          {issue.size ? <span data-size={issue.size}>Size {SIZES[issue.size].toLowerCase()}</span> : null}
        </div>
        {url ? (
          // Kept the same element once the issue is gone, its link off: the focus can still be moved off it.
          <a
            href={gone ? undefined : url}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={gone || undefined}
            className={cn('font-semibold text-pretty text-foreground', gone ? GONE : 'hover:underline')}
          >
            {title}
          </a>
        ) : (
          <span className={cn('font-semibold text-pretty text-foreground', gone && GONE)}>{title}</span>
        )}
        {why || label ? (
          <div
            className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground', gone && GONE)}
          >
            {why ? (
              <span data-why className="min-w-0">
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
        {live || takenHere ? <IssueLiveStatus ref={line} status={status} attemptId={live?.attemptId ?? null} /> : null}
      </div>
      <ConfirmDialog
        trigger={
          <Button
            type="button"
            variant="ghost"
            disabled={gone}
            aria-disabled={gone || undefined}
            className="-mr-2 h-10 flex-none px-3 text-muted-foreground"
          >
            Skip
            <span className="sr-only"> {where}</span>
          </Button>
        }
        open={confirming}
        onOpenChange={(open) => {
          if (open) setError(null);
          setConfirming(open);
        }}
        title="Skip this issue?"
        description={
          <>
            <span className="font-mono">{where}</span> will not be picked for you again. You can&apos;t undo this.
          </>
        }
        action="Skip issue"
        pendingAction="Skipping…"
        pending={pending}
        error={error}
        onConfirm={skip}
        onCloseAutoFocus={(event) => {
          // Its trigger is off once the issue is gone: the focus goes to the line that says so.
          if (!goneNow.current) return;
          event.preventDefault();
          line.current?.focus();
        }}
      />
    </article>
  );
}
