'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ignoreReviewThreads, startFollowUp } from '../actions';
import { HEADING, Pill } from './primitives';
import { attemptHref } from './reviews-ready';
import { Button } from '@/components/ui/button';
import { githubUrlOf } from '@/lib/contribute/attempt-format';
import type { ContributeFeedbackThread, ContributeReviewFeedback } from '@/lib/contribute/contribute.types';
import { threadsByWho, whereOfThread } from '@/lib/contribute/follow-up-flow';
import { followUpErrorMessage } from '@/lib/contribute/follow-up-format';
import { relativeLabel, usd } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

type Choice = 'address' | 'ignore';

/** The most comments one round addresses (the API's). */
const ROUND_MAX = 20;

/** One waiting thread: who wrote it, where, its first line, and Address / Ignore. Its text is untrusted. */
function ThreadRow({
  thread,
  choice,
  onChoose,
  disabled,
}: {
  thread: ContributeFeedbackThread;
  choice: Choice;
  onChoose: (choice: Choice) => void;
  disabled: boolean;
}) {
  const url = githubUrlOf(thread.url);
  const where = whereOfThread(thread);
  return (
    <li
      data-feedback-thread={thread.commentId}
      data-choice={choice}
      className={cn(
        'flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4',
        choice === 'ignore' && 'bg-muted/40',
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{thread.author || 'A reviewer'}</span>
          {where ? <span className="font-mono break-all">{where}</span> : null}
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
              On GitHub ↗
            </a>
          ) : null}
        </div>
        <p className={cn('text-sm break-words', choice === 'ignore' && 'text-muted-foreground line-through')}>
          {thread.excerpt}
        </p>
      </div>
      <fieldset className="flex flex-none gap-1" aria-label={`For ${thread.author || 'this'} comment`}>
        {(['address', 'ignore'] as const).map((each) => (
          <Button
            key={each}
            type="button"
            size="sm"
            variant={choice === each ? (each === 'address' ? 'default' : 'secondary') : 'outline'}
            aria-pressed={choice === each}
            disabled={disabled}
            onClick={() => onChoose(each)}
            className="min-h-9 min-w-20"
          >
            {each === 'address' ? 'Address' : 'Ignore'}
          </Button>
        ))}
      </fieldset>
    </li>
  );
}

function Group({ title, children, count }: { title: string; children: React.ReactNode; count: number }) {
  if (!count) return null;
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border">
      <h3 className="border-b bg-muted/40 px-4 py-2 text-sm font-semibold">
        {title} <span className="font-normal text-muted-foreground">· {count}</span>
      </h3>
      <ul className="divide-y">{children}</ul>
    </div>
  );
}

/**
 * Review feedback on an open pull request: the review threads waiting for an answer, bots' and people's apart, each
 * to Address or Ignore, and one button that starts a follow-up on the ones addressed. An Ignore is saved at once and
 * holds until someone comments on the thread again; ignored threads are listed apart, and may be addressed again.
 * Nothing is posted or pushed before the user's review.
 */
export function ReviewFeedbackCard({
  prId,
  prNumber,
  feedback,
  canStart,
  blocked,
  attemptCapUsd,
  now,
}: {
  prId: string;
  prNumber: number | null;
  feedback: ContributeReviewFeedback;
  /** A round may start now (one left, none under way, the pull request open). */
  canStart: boolean;
  /** Why it cannot, in a line; shown in place of the button. */
  blocked: string | null;
  attemptCapUsd?: number;
  now?: Date;
}) {
  const router = useRouter();
  const [choices, setChoices] = useState<Record<string, Choice>>(() =>
    Object.fromEntries(feedback.threads.map((thread) => [thread.commentId, thread.ignored ? 'ignore' : 'address'])),
  );
  const [showIgnored, setShowIgnored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const [, startSaving] = useTransition();
  const busy = pending || done;

  const fresh = feedback.threads.filter((thread) => !thread.ignored);
  const earlier = feedback.threads.filter((thread) => thread.ignored);
  const shown = showIgnored ? feedback.threads : fresh;
  const { bots, people } = threadsByWho(shown);
  const chosen = feedback.threads.filter((thread) => choices[thread.commentId] === 'address');
  const tooMany = chosen.length > ROUND_MAX;
  const pr = prNumber ? `pull request #${prNumber}` : 'the pull request';

  const start = () =>
    startTransition(async () => {
      setError(null);
      const result = await startFollowUp(
        prId,
        chosen.map((thread) => thread.commentId),
      );
      if (!result.ok) {
        setError(followUpErrorMessage(result.error, result.message));
        return;
      }
      setDone(true);
      router.push(attemptHref(result.data.attemptId));
    });

  // Ignore is kept on the pull request at once (Address undoes it): the comment stays out of every round, autopilot's
  // too, until someone comments on it again.
  const choose = (thread: ContributeFeedbackThread, choice: Choice) => {
    const before = choices[thread.commentId] ?? 'address';
    if (before === choice) return;
    setChoices((current) => ({ ...current, [thread.commentId]: choice }));
    setError(null);
    startSaving(async () => {
      const result = await ignoreReviewThreads(prId, [thread.commentId], choice === 'ignore');
      if (!result.ok) {
        setChoices((current) => ({ ...current, [thread.commentId]: before }));
        setError(followUpErrorMessage(result.error, result.message));
      }
    });
  };

  const row = (thread: ContributeFeedbackThread) => (
    <ThreadRow
      key={thread.commentId}
      thread={thread}
      choice={choices[thread.commentId] ?? 'address'}
      onChoose={(choice) => choose(thread, choice)}
      disabled={busy}
    />
  );

  return (
    <section data-panel="review-feedback" className="flex flex-col gap-3.5 rounded-xl border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className={HEADING.card}>Review feedback</h2>
          <Pill tone={fresh.length ? 'amber' : 'neutral'}>{fresh.length} waiting</Pill>
        </div>
        <p className="text-sm text-muted-foreground">
          {fresh.length
            ? `${fresh.length === 1 ? 'One comment waits' : `${fresh.length} comments wait`} for an answer on ${pr}. Ignore one to keep it out of every follow-up until someone comments on it again.`
            : `No new comment waits for an answer on ${pr}.`}
          {feedback.readAt ? ` Read from GitHub ${relativeLabel(feedback.readAt, now)}.` : ''}
        </p>
      </div>
      <Group title="Bots" count={bots.length}>
        {bots.map(row)}
      </Group>
      <Group title="People" count={people.length}>
        {people.map(row)}
      </Group>
      {earlier.length ? (
        <button
          type="button"
          onClick={() => setShowIgnored((on) => !on)}
          aria-expanded={showIgnored}
          className="self-start text-sm font-medium text-link hover:underline"
        >
          {showIgnored ? 'Hide' : 'Show'} {earlier.length} ignored
        </button>
      ) : null}
      {error ? (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      ) : null}
      {canStart ? (
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            size="lg"
            onClick={start}
            disabled={busy || !chosen.length || tooMany}
            className="min-h-11 self-stretch font-semibold sm:self-start"
          >
            {busy
              ? 'Starting…'
              : chosen.length
                ? `Address ${chosen.length} ${chosen.length === 1 ? 'comment' : 'comments'}`
                : 'Choose a comment to address'}
          </Button>
          {tooMany ? (
            <span role="status" className="text-sm text-warning">
              A round takes {ROUND_MAX} comments at most. Set {chosen.length - ROUND_MAX} to Ignore for now; you can
              address them in a later round.
            </span>
          ) : null}
          <span className="text-xs text-muted-foreground">
            The agent works on your Claude key
            {typeof attemptCapUsd === 'number' ? ` within your ${usd(attemptCapUsd)} limit for one attempt` : ''}, runs
            the tests, and drafts a reply to each comment. You review it all before anything is pushed or posted, unless
            your autopilot is on.
          </span>
        </div>
      ) : blocked ? (
        <span className="text-sm text-muted-foreground">{blocked}</span>
      ) : null}
    </section>
  );
}
