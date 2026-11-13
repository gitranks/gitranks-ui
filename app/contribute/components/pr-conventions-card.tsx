'use client';

import { Square, SquareCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, useTransition } from 'react';

import { fixPullRequest } from '../actions';
import { CodeBlock } from './code-block';
import { MarkHandledButton } from './follow-up-buttons';
import { offOf, useSessionActions } from './session-actions';
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

/** The last fix in words: on its way, done, or why it failed. */
function fixTextOf(fix: ContributePrFix): string {
  const words = PR_FIX_WORDS[fix.kind];
  if (fix.state === 'SENDING') return `${words}…`;
  if (fix.state === 'DONE') return `${words}: done.`;
  return `${words} did not go through${fix.note ? `: ${fix.note}` : '.'} Try again.`;
}

/** The API's words with their `backticked` names (a check, a title prefix) set as code. */
export function Words({ text }: { text: string }) {
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
export function IssueWhy({ issue }: { issue: ContributePrConventionIssue }) {
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
export function IssueFields({ fields }: { fields: ContributePrIssueField[] }) {
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

/** One rule the open pull request breaks, as the rules card lists it: its kind, its issue (none for a title signal). */
export type RuleItemProps = {
  attemptId: string;
  kind: 'title' | 'description' | 'changelog' | 'cla';
  issue: ContributePrConventionIssue | null;
  /** A one-click fix for it did not go through: its main button reads "Try again". */
  failed: boolean;
  /** The item's main control is the card's primary (the first item's); else outline. */
  primary: boolean;
  /** The PR's title as last set, and its description, for the editors. */
  title: string;
  body: string;
  conventions: ContributeRepoConventions | null;
  pr: { prId: string; number: number; url: string | null };
  /** Every signal on the PR is TITLE: "I've done it" clears the same on an API without `kinds`. */
  titleAll: boolean;
  /** The fixes a stop holds back: their controls are not drawn. */
  blocked: { retitle: boolean; body: boolean; changelog: boolean };
};

const SMALL = 'min-h-11 px-4 font-semibold sm:min-h-9';

/**
 * One rule's controls and editor: a retitle to the suggested title (or one the user types), the description edited,
 * the changelog line fixed in a commit, the CLA signed by its comment or page; a title the repo's check flags with no
 * fix read goes to GitHub, with "I've done it". A control a stop holds back is not drawn.
 */
export function RuleItemControls({
  attemptId,
  kind,
  issue,
  failed,
  primary,
  title,
  body,
  conventions,
  pr,
  titleAll,
  blocked,
}: RuleItemProps) {
  const router = useRouter();
  const actions = useSessionActions();
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<'TITLE' | 'BODY' | null>(null);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftBody, setDraftBody] = useState(body);
  useEffect(() => setDraftTitle(title), [title]);
  useEffect(() => setDraftBody(body), [body]);
  const busy = pending || offOf(actions);
  const look = (main: boolean) => (main && primary ? 'default' : 'outline');

  const send = (fixKind: ContributePrFixKind, values: { title?: string; body?: string } = {}) =>
    startTransition(async () => {
      setError(null);
      const result = await fixPullRequest({ attemptId, kind: fixKind, ...values });
      if (!result.ok) {
        setError(attemptActionErrorMessage(result.error, result.message));
        return;
      }
      setEditing(null);
      router.refresh();
    });

  const github = (main: boolean) =>
    pr.url ? (
      <Button asChild size="lg" variant={look(main)} className={SMALL}>
        <a href={pr.url} target="_blank" rel="noopener noreferrer">
          Open #{pr.number} on GitHub ↗<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </Button>
    ) : null;

  const controls = (() => {
    switch (kind) {
      case 'title':
        if (!issue) {
          return (
            <>
              {github(true)}
              <MarkHandledButton
                prId={pr.prId}
                prNumber={pr.number}
                kinds={['TITLE']}
                all={titleAll}
                label="I've done it"
              />
            </>
          );
        }
        if (blocked.retitle) return github(true);
        return (
          <>
            {issue.suggestion ? (
              <Button
                type="button"
                size="lg"
                variant={look(true)}
                disabled={busy}
                className={SMALL}
                onClick={() => send('TITLE', { title: issue.suggestion ?? '' })}
              >
                {failed ? 'Try again' : `Retitle to “${issue.suggestion}”`}
              </Button>
            ) : null}
            <Button
              type="button"
              size="lg"
              variant={issue.suggestion ? 'outline' : look(true)}
              disabled={busy}
              aria-expanded={editing === 'TITLE'}
              aria-controls={`${id}-title-editor`}
              className={SMALL}
              onClick={() => setEditing(editing === 'TITLE' ? null : 'TITLE')}
            >
              {failed && !issue.suggestion ? 'Try again' : 'Edit the title'}
            </Button>
          </>
        );
      case 'description':
        if (!issue?.check || blocked.body) return github(true);
        return (
          <Button
            type="button"
            size="lg"
            variant={look(true)}
            disabled={busy}
            aria-expanded={editing === 'BODY'}
            aria-controls={`${id}-body-editor`}
            className={SMALL}
            onClick={() => setEditing(editing === 'BODY' ? null : 'BODY')}
          >
            {failed ? 'Try again' : 'Edit the description'}
          </Button>
        );
      case 'changelog':
        if (!issue?.suggestion || blocked.changelog) return github(true);
        return (
          <Button
            type="button"
            size="lg"
            variant={look(true)}
            disabled={busy}
            className={SMALL}
            onClick={() => send('CHANGELOG')}
          >
            {failed ? 'Try again' : 'Fix it'}
          </Button>
        );
      case 'cla': {
        const sign = httpsOnly(issue?.suggestion);
        return !conventions?.cla?.signComment && sign ? (
          <Button asChild size="lg" variant={look(true)} className={SMALL}>
            <a href={sign} target="_blank" rel="noreferrer">
              Sign the {conventions?.cla?.agreement ?? 'CLA'} ↗<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </Button>
        ) : null;
      }
    }
  })();

  const draftProblem = titleProblemsOf(draftTitle, conventions, true);
  return (
    <div className="flex flex-col gap-2.5 text-sm" data-rule-item={kind} data-pr-issue={issue?.kind}>
      {kind === 'changelog' && issue?.suggestion ? (
        <div className="flex flex-col gap-1">
          <code className="break-words rounded bg-muted/60 px-2 py-1 font-mono text-xs">{issue.suggestion}</code>
          <span className="text-xs text-muted-foreground">One small commit on the pull request&apos;s branch.</span>
        </div>
      ) : null}
      {kind === 'description' && !issue?.check && issue?.fields?.length ? <IssueFields fields={issue.fields} /> : null}
      {kind === 'cla' && conventions?.cla?.signComment ? (
        <div className="flex flex-col gap-1.5">
          <CodeBlock label="Your comment on the pull request" copyLabel="Copy the comment" wrap>
            {conventions.cla.signComment}
          </CodeBlock>
          <span className="text-xs text-muted-foreground">
            Word for word: the repo&apos;s bot records your signature from it.
            {httpsOnly(issue?.suggestion) ? (
              <>
                {' '}
                <a
                  href={httpsOnly(issue?.suggestion) ?? undefined}
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
      ) : null}
      {controls ? <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">{controls}</div> : null}
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
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={busy || Boolean(draftProblem) || !draftTitle.trim()}
            >
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
            <Button type="submit" size="sm" variant="outline" disabled={busy || !draftBody.trim()}>
              Update the description
            </Button>
          </div>
        </form>
      ) : null}
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/** The fix on its way, done, or why it failed: always there, so a screen reader hears each change. */
export function RuleFixState({ fix }: { fix: ContributePrFix | null }) {
  return (
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
  );
}
