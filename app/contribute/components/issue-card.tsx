'use client';

import { useState, useTransition } from 'react';

import { skipIssue } from '../actions';
import { ConfirmDialog } from './confirm-dialog';
import { Pill } from './primitives';
import { Button } from '@/components/ui/button';
import { githubUrlOf } from '@/lib/contribute/attempt-format';
import type { ContributeIssue } from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { GOOD_FIRST_LABEL, LANGUAGES, SIZES } from '@/lib/contribute/format';

/** The one GitHub label shown: a beginner-friendly one where there is one, else the first. */
const labelOf = (labels: string[]) => labels.find((label) => GOOD_FIRST_LABEL.test(label)) ?? labels[0];

/**
 * One issue picked for the user, as a row of the Issues list: where and how big, what, why it was picked, and Skip,
 * which asks first. One GitHub label is shown, and the count of the rest. `other` marks an issue from outside the
 * user's own list.
 */
export function IssueCard({ issue, other = false }: { issue: ContributeIssue; other?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const skip = () =>
    startTransition(async () => {
      setError(null);
      const result = await skipIssue(issue.issueId);
      if (!result.ok) {
        setError(contributeErrorMessage(result.error, result.message));
        return;
      }
      setConfirming(false);
      setSkipped(true);
    });

  const where = `${issue.nameWithOwner} #${issue.number}`;
  if (skipped) {
    return (
      <p role="status" className="px-4 py-3 text-sm text-muted-foreground sm:px-5">
        Skipped {where}. It will not be picked for you again.
      </p>
    );
  }

  const title = issue.title?.trim() || `Issue #${issue.number}`;
  const url = githubUrlOf(issue.url);
  const label = labelOf(issue.labels);
  const more = issue.labels.length - 1;
  const why = issue.why?.trim();

  return (
    <article
      data-issue={issue.issueId}
      data-other={other || undefined}
      className="flex items-start gap-3 px-4 py-3.5 sm:px-5"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="font-mono break-all text-foreground/80">
            {issue.nameWithOwner} · #{issue.number}
          </span>
          {issue.language ? <span>{LANGUAGES[issue.language]}</span> : null}
          {issue.size ? <span data-size={issue.size}>Size {SIZES[issue.size].toLowerCase()}</span> : null}
        </div>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-pretty text-foreground hover:underline"
          >
            {title}
          </a>
        ) : (
          <span className="font-semibold text-pretty text-foreground">{title}</span>
        )}
        {why || label ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {why ? (
              <span data-why className="min-w-0">
                <span className="sr-only">Why it was picked: </span>
                {why}
              </span>
            ) : null}
            {label ? (
              <span className="flex items-center gap-1" data-labels={issue.labels.length}>
                <Pill tone={GOOD_FIRST_LABEL.test(label) ? 'green' : 'neutral'}>{label}</Pill>
                {more > 0 ? (
                  <span className="text-xs" title={issue.labels.filter((each) => each !== label).join(', ')}>
                    +{more}
                    <span className="sr-only"> more label{more === 1 ? '' : 's'}</span>
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        className="-mr-2 flex-none text-muted-foreground"
      >
        Skip
        <span className="sr-only"> {where}</span>
      </Button>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
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
      />
    </article>
  );
}
