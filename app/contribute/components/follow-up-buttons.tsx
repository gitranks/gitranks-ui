'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { markNeedsYouHandled, retryAttempt, startFollowUp, vetoAutopilot } from '../actions';
import { attemptHref } from './reviews-ready';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { timeLabel } from '@/lib/contribute/attempt-format';
import { attemptActionErrorMessage } from '@/lib/contribute/errors';
import {
  FOLLOW_UP_NOTE_MAX,
  followUpErrorMessage,
  handledErrorMessage,
  vetoErrorMessage,
} from '@/lib/contribute/follow-up-format';
import { relativeLabel } from '@/lib/contribute/format';

const ErrorNote = ({ error }: { error: string | null }) =>
  error ? (
    <span role="alert" className="text-sm text-destructive">
      {error}
    </span>
  ) : null;

/**
 * The user's optional note to a follow-up's agent: what they think is wrong, or what to focus on. The agent reads it
 * first and follows it over the comments on the pull request. At most `FOLLOW_UP_NOTE_MAX` characters.
 */
export function FollowUpNote({
  id,
  label,
  placeholder,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5" data-follow-up-note="">
      <label htmlFor={id} className="text-sm font-medium">
        {label} <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <Textarea
        id={id}
        aria-describedby={`${id}-hint ${id}-count`}
        rows={3}
        maxLength={FOLLOW_UP_NOTE_MAX}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="min-h-20"
      />
      <span className="flex justify-between gap-3 text-xs text-muted-foreground">
        <span id={`${id}-hint`}>
          Your note comes first: where it and a comment on the pull request disagree, the agent follows yours.
        </span>
        <span id={`${id}-count`} aria-live="polite" className="shrink-0 font-mono tabular-nums">
          {value.length.toLocaleString('en-US')} / {FOLLOW_UP_NOTE_MAX.toLocaleString('en-US')}
        </span>
      </span>
    </div>
  );
}

/**
 * The next follow-up run: the user's note, then "Start a follow-up", the main action when GitRanks recommends a run
 * (`primary`), else an outline one. Opens the run once it starts: its review comes there once the agent is done.
 */
export function StartFollowUpButton({
  prId,
  primary = true,
  noteLabel = 'A note for the agent',
  notePlaceholder = 'Anything it should know? For example: the lint rule is wrong here, fix the test instead.',
}: {
  prId: string;
  primary?: boolean;
  noteLabel?: string;
  notePlaceholder?: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** It went through: the button stays off until the next page lands. */
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const click = () =>
    startTransition(async () => {
      setError(null);
      const result = await startFollowUp(prId, undefined, note);
      if (!result.ok) {
        setError(followUpErrorMessage(result.error, result.message));
        return;
      }
      setDone(true);
      router.push(attemptHref(result.data.attemptId));
    });

  return (
    <div className="flex flex-col gap-3" data-start-follow-up={prId}>
      <FollowUpNote
        id={`follow-up-note-${prId}`}
        label={noteLabel}
        placeholder={notePlaceholder}
        value={note}
        onChange={setNote}
        disabled={pending || done}
      />
      <div className="flex flex-col items-start gap-1.5">
        <Button
          type="button"
          size="lg"
          variant={primary ? 'default' : 'outline'}
          onClick={click}
          disabled={pending || done}
          className="min-h-11 px-4 font-semibold"
        >
          {pending || done ? 'Starting…' : 'Start a follow-up'}
        </Button>
        <ErrorNote error={error} />
      </div>
    </div>
  );
}

/**
 * A check that ran out of budget or time, tried again once: a new attempt on the issue, queued, its check on twice the
 * budget. Opens it.
 */
export function RetryCheckButton({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const click = () =>
    startTransition(async () => {
      setError(null);
      const result = await retryAttempt(attemptId);
      if (!result.ok) {
        setError(
          result.error === 'INVALID' && /tried again|only a check/i.test(result.message ?? '')
            ? 'It was tried again already, or it can no longer be. Reload the page.'
            : attemptActionErrorMessage(result.error, result.message),
        );
        return;
      }
      setDone(true);
      router.push(attemptHref(result.data.attemptId));
    });

  return (
    <div className="flex flex-col items-start gap-1.5" data-retry-check={attemptId}>
      <Button type="button" size="sm" onClick={click} disabled={pending || done}>
        {pending || done ? 'Queueing…' : 'Retry with a bigger check budget'}
      </Button>
      <span className="text-xs text-muted-foreground">
        Once: the agent checks the issue again with twice the budget and time, as your limits allow.
      </span>
      <ErrorNote error={error} />
    </div>
  );
}

/**
 * "Mark as handled": the user took care of what the pull request's reads found, so it leaves Needs you. Something new
 * on it raises it again.
 */
export function MarkHandledButton({ prId, prNumber }: { prId: string; prNumber?: number }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  /** It went through: the button stays off until the page reads again. */
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const click = () =>
    startTransition(async () => {
      setError(null);
      const result = await markNeedsYouHandled(prId);
      if (!result.ok) {
        setError(handledErrorMessage(result.error, result.message));
        return;
      }
      setDone(true);
      router.refresh();
    });

  return (
    <div className="flex flex-col items-start gap-1.5" data-mark-handled={prId}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={click}
        disabled={pending || done}
        aria-label={prNumber ? `Mark pull request #${prNumber} as handled` : undefined}
      >
        {pending || done ? 'Marking…' : 'Mark as handled'}
      </Button>
      <ErrorNote error={error} />
    </div>
  );
}

/** Stops autopilot from submitting the attempt: it comes to the review instead. */
export function StopAutopilotButton({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  /** It went through: the button stays off until the next page lands. */
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const click = () =>
    startTransition(async () => {
      setError(null);
      const result = await vetoAutopilot(attemptId);
      if (!result.ok) {
        setError(vetoErrorMessage(result.error, result.message));
        return;
      }
      setDone(true);
      router.refresh();
    });

  return (
    <div className="flex flex-col items-start gap-1.5" data-stop-autopilot={attemptId}>
      <Button
        type="button"
        variant="ghost"
        size="lg"
        onClick={click}
        disabled={pending || done}
        className="border border-warning/40 bg-background px-4 font-semibold text-warning hover:bg-warning-soft hover:text-warning dark:hover:bg-warning-soft"
      >
        {pending || done ? 'Stopping…' : 'Stop'}
      </Button>
      <ErrorNote error={error} />
    </div>
  );
}

/**
 * How long until autopilot submits: `in 42 minutes, at 12:42 UTC`, kept current while the page is open. `from` is the
 * time the server rendered at, so the first render on the client reads the same.
 */
export function AutosubmitCountdown({ at, from }: { at: string; from: string }) {
  const [now, setNow] = useState(() => new Date(from));

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(timer);
  }, []);

  const due = new Date(at).getTime() <= now.getTime();
  return (
    <span data-autosubmit-at={at} className="font-semibold">
      {due ? 'Any moment now' : `It submits ${relativeLabel(at, now)}, at ${timeLabel(at)}`}
    </span>
  );
}
