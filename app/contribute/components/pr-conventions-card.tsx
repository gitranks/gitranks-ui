'use client';

import { Square, SquareCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, useTransition } from 'react';

import { fixPullRequest } from '../actions';
import { CodeBlock } from './code-block';
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
  type ContributePrIssueField,
  type ContributeRepoConventions,
  httpsOnly,
  PR_FIX_WORDS,
  titleProblemsOf,
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
  conventions: ContributeRepoConventions | null;
};

/** The last fix in words: on its way, done, or why it failed. */
function fixTextOf(fix: ContributePrFix): string {
  const words = PR_FIX_WORDS[fix.kind];
  if (fix.state === 'SENDING') return `${words}…`;
  if (fix.state === 'DONE') return `${words}: done.`;
  return `${words} did not go through${fix.note ? `: ${fix.note}` : '.'} Try again.`;
}

/** The API's words with their `backticked` names (a check, a title prefix) set as code. */
function Words({ text }: { text: string }) {
  return text.split(/`([^`\n]+)`/).map((part, index) =>
    index % 2 ? (
      <code key={index} className="rounded bg-muted/60 px-1 font-mono text-xs">
        {part}
      </code>
    ) : (
      part
    ),
  );
}

/** Why the user sees an issue (and the repo's file that asks it), then what to do, in order. */
function IssueWhy({ issue }: { issue: ContributePrConventionIssue }) {
  const source = issue.source && httpsOnly(issue.source.url);
  const steps = issue.steps ?? [];
  return (
    <>
      {issue.why || source ? (
        <p className="text-muted-foreground [overflow-wrap:anywhere]">
          {issue.why ? (
            <>
              <span className="font-medium text-foreground">Why you see this: </span>
              <Words text={issue.why} />{' '}
            </>
          ) : null}
          {source ? (
            <a href={source} target="_blank" rel="noreferrer" className="text-link">
              Read the rule{issue.source?.label ? ` (${issue.source.label})` : ''}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : null}
        </p>
      ) : null}
      {steps.length ? (
        <div className="flex flex-col gap-1">
          <span className="font-medium">What to do</span>
          <ol className="ml-5 flex list-decimal flex-col gap-1">
            {steps.map((step, index) => (
              <li key={`${index}-${step}`}>
                <Words text={step} />
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </>
  );
}

/** What to fill on GitHub: each section's text to paste, then the checklist lines to tick or leave. */
function IssueFields({ fields }: { fields: ContributePrIssueField[] }) {
  const texts = fields.filter(({ tick }) => tick == null);
  const boxes = fields.filter(({ tick }) => tick != null);
  return (
    <div className="flex flex-col gap-3" data-pr-fields="">
      {texts.map((field, index) => (
        <div key={`${index}-${field.label}`} className="flex flex-col gap-1.5">
          {field.value ? (
            <CodeBlock label={`Under “${field.label}”`} copyLabel={`Copy the text for ${field.label}`} wrap>
              {field.value}
            </CodeBlock>
          ) : (
            <span className="font-medium">Under “{field.label}”</span>
          )}
          {field.note ? <span className="text-xs text-muted-foreground">{field.note}</span> : null}
        </div>
      ))}
      {boxes.length ? (
        <div className="flex flex-col gap-1.5">
          <span className="font-medium">The checklist</span>
          <ul className="flex flex-col gap-2">
            {boxes.map((field, index) => (
              <li key={`${index}-${field.label}`} className="flex gap-2">
                {field.tick ? (
                  <SquareCheck aria-hidden="true" className="mt-0.5 size-4 flex-none text-positive-strong" />
                ) : (
                  <Square aria-hidden="true" className="mt-0.5 size-4 flex-none text-muted-foreground" />
                )}
                <span className="flex flex-col gap-0.5">
                  <span>
                    <span className="font-medium">{field.tick ? 'Tick: ' : 'Leave unticked: '}</span>
                    {field.label}
                  </span>
                  {field.note ? <span className="text-xs text-muted-foreground">{field.note}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * What the open pull request fails of its repo's conventions, each with its one-click fix: a retitle to the
 * suggested title (or one the user types), the changelog line fixed in a commit, the description edited; the CLA is
 * a link only, or the comment that signs it to copy, since nobody can sign it for the user. Each says why the user
 * sees it and what to do, step by step; a template the repo leaves to the user comes drafted, section by section.
 */
export function PrConventionsCard({
  attemptId,
  prNumber,
  issues,
  fix,
  title,
  body,
  conventions,
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
  // The PR's title and description as they stand now: a fix that went through is the editors' new start.
  useEffect(() => setDraftTitle(title), [title]);
  useEffect(() => setDraftBody(body), [body]);

  // A fix that settled with nothing left to fix says no more.
  if (!issues.length && !sending) return null;

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

  const draftProblem = titleProblemsOf(draftTitle, conventions, true);

  return (
    <section data-panel="pr-conventions" className="flex flex-col gap-3 rounded-xl border bg-card p-5">
      <h2 className={HEADING.card}>#{prNumber} and the repo&apos;s rules</h2>
      {issues.length ? (
        <ul className="flex flex-col gap-3">
          {issues.map((issue, index) => (
            <li
              key={`${issue.kind}-${issue.check ?? ''}-${index}`}
              data-pr-issue={issue.kind}
              className="flex flex-col gap-2 text-sm"
            >
              <span className="font-medium">
                {/* The comment shows below, to copy: the line says what to do with it. */}
                {issue.kind === 'CLA' && conventions?.cla?.signComment
                  ? `Sign the repo's ${conventions.cla.agreement ?? 'CLA'}: post this comment on the pull request yourself. We can't sign for you.`
                  : issue.message}
                {issue.check ? <span className="font-normal text-muted-foreground"> ({issue.check})</span> : null}
              </span>
              <IssueWhy issue={issue} />
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
                    aria-expanded={editing === 'TITLE'}
                    aria-controls={`${id}-title-editor`}
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
              {issue.kind === 'TEMPLATE' && httpsOnly(issue.suggestion) ? (
                <a
                  href={httpsOnly(issue.suggestion) ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link"
                >
                  Open #{prNumber} on GitHub<span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : issue.kind === 'TEMPLATE' ? (
                <div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    aria-expanded={editing === 'BODY'}
                    aria-controls={`${id}-body-editor`}
                    onClick={() => setEditing(editing === 'BODY' ? null : 'BODY')}
                  >
                    Edit the description
                  </Button>
                </div>
              ) : null}
              {issue.kind === 'CLA' && conventions?.cla?.signComment ? (
                <div className="flex flex-col gap-1.5">
                  <CodeBlock label="Your comment on the pull request" copyLabel="Copy the comment" wrap>
                    {conventions.cla.signComment}
                  </CodeBlock>
                  <span className="text-xs text-muted-foreground">
                    Word for word: the repo&apos;s bot records your signature from it.
                    {httpsOnly(issue.suggestion) ? (
                      <>
                        {' '}
                        <a
                          href={httpsOnly(issue.suggestion) ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="text-link"
                        >
                          Read the {conventions.cla.agreement ?? 'CLA'} first
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      </>
                    ) : null}
                  </span>
                </div>
              ) : issue.kind === 'CLA' ? (
                httpsOnly(issue.suggestion) ? (
                  <a
                    href={httpsOnly(issue.suggestion) ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="text-link"
                  >
                    Sign the {conventions?.cla?.agreement ?? 'CLA'}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    The check on the pull request links where to sign.
                  </span>
                )
              ) : null}
              {issue.fields?.length ? <IssueFields fields={issue.fields} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {editing === 'TITLE' ? (
        <form
          id={`${id}-title-editor`}
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
          id={`${id}-body-editor`}
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
          <span className="text-xs text-muted-foreground">The footer line is kept, in its current wording.</span>
          <div>
            <Button type="submit" size="sm" disabled={busy || !draftBody.trim()}>
              Update the description
            </Button>
          </div>
        </form>
      ) : null}
      {/* Always there, so a screen reader hears each change of the fix's state. */}
      <p
        role="status"
        data-pr-fix={fix ? fix.state.toLowerCase() : undefined}
        className={`text-sm ${
          fix?.state === 'FAILED'
            ? 'text-destructive'
            : fix?.state === 'DONE'
              ? 'text-positive-strong'
              : 'text-muted-foreground'
        }`}
      >
        {fix ? fixTextOf(fix) : ''}
      </p>
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
    </section>
  );
}
