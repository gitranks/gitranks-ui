'use client';

import { useState, useTransition } from 'react';

import { skipIssue } from '../actions';
import { Pill } from './primitives';
import { Button } from '@/components/ui/button';
import { githubUrlOf } from '@/lib/contribute/attempt-format';
import type { ContributeIssue } from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { GOOD_FIRST_LABEL, KIND_ONE, LANGUAGES, SIZES } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

/** One issue picked for the user: where, what, why, and Skip. `best` marks the top of the list. */
export function IssueCard({ issue, best = false }: { issue: ContributeIssue; best?: boolean }) {
  const [skipped, setSkipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const skip = () =>
    startTransition(async () => {
      setError(null);
      const result = await skipIssue(issue.issueId);
      if (result.ok) setSkipped(true);
      else setError(contributeErrorMessage(result.error, result.message));
    });

  if (skipped) {
    return (
      <p role="status" className="rounded-xl border border-dashed px-5 py-3 text-sm text-muted-foreground">
        Skipped {issue.nameWithOwner} #{issue.number}. It will not be picked for you again.
      </p>
    );
  }

  const title = issue.title?.trim() || `Issue #${issue.number}`;
  const url = githubUrlOf(issue.url);

  return (
    <article
      data-issue={issue.issueId}
      data-best={best || undefined}
      className={cn(
        'flex flex-wrap items-start gap-4 rounded-xl border bg-card px-5 py-4',
        best && 'border-primary/40',
      )}
    >
      <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-sm text-muted-foreground">
          <span className="font-mono text-foreground/80">
            {issue.nameWithOwner} · #{issue.number}
          </span>
          {issue.language ? <span>{LANGUAGES[issue.language]}</span> : null}
          {best ? <Pill tone="violet">Best match</Pill> : null}
        </div>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-lg font-semibold text-foreground hover:underline"
          >
            {title}
          </a>
        ) : (
          <span className="text-lg font-semibold text-foreground">{title}</span>
        )}
        {issue.labels.length || issue.kind ? (
          <div className="flex flex-wrap gap-1.5">
            {issue.kind ? <Pill tone="violet">{KIND_ONE[issue.kind]}</Pill> : null}
            {issue.labels.map((label) => (
              <Pill key={label} tone={GOOD_FIRST_LABEL.test(label) ? 'green' : 'neutral'}>
                {label}
              </Pill>
            ))}
          </div>
        ) : null}
        {issue.why ? (
          <span className="text-sm text-muted-foreground">
            <span className="text-foreground/60">Why:</span> {issue.why}
          </span>
        ) : null}
      </div>
      <div className="flex flex-[0_0_200px] flex-col gap-2.5">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-sm">
          <dt className="text-muted-foreground">Size</dt>
          <dd className="font-mono">{issue.size ? SIZES[issue.size] : 'not known'}</dd>
          <dt className="text-muted-foreground">Match</dt>
          <dd className="font-mono">#{issue.rank}</dd>
        </dl>
        <Button type="button" variant="outline" size="lg" onClick={skip} disabled={pending}>
          {pending ? 'Skipping…' : 'Skip'}
        </Button>
        {error ? (
          <span role="alert" className="text-sm text-destructive">
            {error}
          </span>
        ) : null}
      </div>
    </article>
  );
}
