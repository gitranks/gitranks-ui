'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';

import { fixPullRequest } from '../actions';
import { HEADING } from './primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PR_BODY_MAX, PR_TITLE_MAX } from '@/lib/contribute/attempt-format';
import { attemptActionErrorMessage } from '@/lib/contribute/errors';
import {
  type ContributePrConventionIssue,
  type ContributePrFix,
  type ContributePrFixKind,
  type ContributeTitleRule,
  titleProblemOf,
} from '@/lib/contribute/pr-conventions';

export type PrConventionsCardProps = {
  attemptId: string;
  prNumber: number;
  issues: ContributePrConventionIssue[];
  fix: ContributePrFix | null;
  /** The PR's title as last set, for the title editor. */
  title: string;
  /** The description as approved, for the description editor. */
  body: string;
  titleRule: ContributeTitleRule | null;
};

const FIX_WORDS: Record<ContributePrFix['kind'], string> = {
  LINK: 'Linking the changelog line to the pull request',
  CHANGELOG: 'Fixing the changelog line',
  TITLE: 'Retitling the pull request',
  BODY: 'Updating the description',
};

/** The last fix in a line: on its way, done, or why it failed. */
function FixStatus({ fix }: { fix: ContributePrFix }) {
  const words = FIX_WORDS[fix.kind];
  if (fix.state === 'SENDING') {
    return (
      <p role="status" data-pr-fix="sending" className="text-sm text-muted-foreground">
        {words}…
      </p>
    );
  }
  if (fix.state === 'DONE') {
    return (
      <p role="status" data-pr-fix="done" className="text-sm text-positive-strong">
        {words}: done.
      </p>
    );
  }
  return (
    <p role="status" data-pr-fix="failed" className="text-sm text-destructive">
      {words} did not go through{fix.note ? `: ${fix.note}` : '.'} Try again.
    </p>
  );
}

/**
 * What the open pull request fails of its repo's conventions, each with its one-click fix: a retitle to the
 * suggested title (or one the user types), the changelog line fixed in a commit, the description edited; the CLA is
 * a link only, since nobody can sign it for the user.
 */
export function PrConventionsCard({
  attemptId,
  prNumber,
  issues,
  fix,
  title,
  body,
  titleRule,
}: PrConventionsCardProps) {
  const router = useRouter();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<'TITLE' | 'BODY' | null>(null);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftBody, setDraftBody] = useState(body);
  const sending = fix?.state === 'SENDING';
  const busy = pending || sending;

  if (!issues.length && !fix) return null;

  const send = (kind: ContributePrFixKind, values: { title?: string; body?: string } = {}) =>
    startTransition(async () => {
      setError(null);
      const result = await fixPullRequest({ attemptId, kind, ...values });
      if (!result.ok) {
        setError(attemptActionErrorMessage(result.error, result.message));
        return;
      }
      setEditing(null);
      router.refresh();
    });

  const draftProblem = titleRule?.hard ? titleProblemOf(draftTitle, titleRule) : null;

  return (
    <section data-panel="pr-conventions" className="flex flex-col gap-3 rounded-xl border bg-card p-5">
      <h2 className={HEADING.card}>#{prNumber} and the repo&apos;s rules</h2>
      {issues.length ? (
        <ul className="flex flex-col gap-3">
          {issues.map((issue) => (
            <li key={issue.kind} data-pr-issue={issue.kind} className="flex flex-col gap-1.5 text-sm">
              <span>
                {issue.message}
                {issue.check ? <span className="text-muted-foreground"> ({issue.check})</span> : null}
              </span>
              {issue.kind === 'TITLE' ? (
                <div className="flex flex-wrap gap-2">
                  {issue.suggestion ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => send('TITLE', { title: issue.suggestion ?? '' })}
                    >
                      Retitle to “{issue.suggestion}”
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setEditing(editing === 'TITLE' ? null : 'TITLE')}
                  >
                    Edit the title
                  </Button>
                </div>
              ) : null}
              {issue.kind === 'CHANGELOG' && issue.suggestion ? (
                <div className="flex flex-col gap-1.5">
                  <code className="break-words rounded bg-muted/60 px-2 py-1 font-mono text-xs">
                    {issue.suggestion}
                  </code>
                  <div>
                    <Button type="button" size="sm" disabled={busy} onClick={() => send('CHANGELOG')}>
                      Fix the changelog line
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    One small commit on the pull request&apos;s branch.
                  </span>
                </div>
              ) : null}
              {issue.kind === 'TEMPLATE' ? (
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setEditing(editing === 'BODY' ? null : 'BODY')}
                  >
                    Edit the description
                  </Button>
                </div>
              ) : null}
              {issue.kind === 'CLA' ? (
                issue.suggestion ? (
                  <a href={issue.suggestion} target="_blank" rel="noreferrer" className="text-link">
                    Sign the CLA<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    The check on the pull request links where to sign.
                  </span>
                )
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {editing === 'TITLE' ? (
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!draftProblem && draftTitle.trim()) send('TITLE', { title: draftTitle });
          }}
        >
          <label htmlFor={`${id}-title`} className="text-sm font-medium">
            Title
          </label>
          <Input
            id={`${id}-title`}
            value={draftTitle}
            maxLength={PR_TITLE_MAX}
            aria-invalid={Boolean(draftProblem) || undefined}
            aria-describedby={draftProblem ? `${id}-title-problem` : undefined}
            onChange={(event) => setDraftTitle(event.target.value)}
            className="h-auto rounded-lg py-2 text-sm"
          />
          {draftProblem ? (
            <span id={`${id}-title-problem`} className="text-xs text-destructive">
              {draftProblem}
            </span>
          ) : null}
          <div>
            <Button type="submit" size="sm" disabled={busy || Boolean(draftProblem) || !draftTitle.trim()}>
              Retitle
            </Button>
          </div>
        </form>
      ) : null}
      {editing === 'BODY' ? (
        <form
          className="flex flex-col gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            if (draftBody.trim()) send('BODY', { body: draftBody });
          }}
        >
          <label htmlFor={`${id}-body`} className="text-sm font-medium">
            Description
          </label>
          <Textarea
            id={`${id}-body`}
            rows={10}
            value={draftBody}
            maxLength={PR_BODY_MAX}
            onChange={(event) => setDraftBody(event.target.value)}
            className="field-sizing-fixed resize-y rounded-lg font-mono text-xs leading-normal md:text-xs"
          />
          <span className="text-xs text-muted-foreground">
            The footer line stays as the pull request opened with it.
          </span>
          <div>
            <Button type="submit" size="sm" disabled={busy || !draftBody.trim()}>
              Update the description
            </Button>
          </div>
        </form>
      ) : null}
      {fix ? <FixStatus fix={fix} /> : null}
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
    </section>
  );
}
