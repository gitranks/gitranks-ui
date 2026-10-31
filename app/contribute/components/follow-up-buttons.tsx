'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { markNeedsYouHandled, startFollowUp, vetoAutopilot } from '../actions';
import { attemptHref } from './reviews-ready';
import { Button } from '@/components/ui/button';
import { timeLabel } from '@/lib/contribute/attempt-format';
import { followUpErrorMessage, handledErrorMessage, vetoErrorMessage } from '@/lib/contribute/follow-up-format';
import { relativeLabel } from '@/lib/contribute/format';

const ErrorNote = ({ error }: { error: string | null }) =>
  error ? (
    <span role="alert" className="text-sm text-destructive">
      {error}
    </span>
  ) : null;

/** Starts a follow-up on the pull request, then opens it: its review comes there once the agent is done. */
export function StartFollowUpButton({ prId }: { prId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  /** It went through: the button stays off until the next page lands. */
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const click = () =>
    startTransition(async () => {
      setError(null);
      const result = await startFollowUp(prId);
      if (!result.ok) {
        setError(followUpErrorMessage(result.error, result.message));
        return;
      }
      setDone(true);
      router.push(attemptHref(result.data.attemptId));
    });

  return (
    <div className="flex flex-col items-start gap-1.5" data-start-follow-up={prId}>
      <Button type="button" size="lg" onClick={click} disabled={pending || done} className="px-4 font-semibold">
        {pending || done ? 'Starting…' : 'Start a follow-up'}
      </Button>
      <ErrorNote error={error} />
    </div>
  );
}

/**
 * "Mark as handled": the user took care of what the pull request's reads found, so it leaves Needs you. Something new
 * on it raises it again.
 */
export function MarkHandledButton({ prId }: { prId: string }) {
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
      <Button type="button" variant="outline" size="sm" onClick={click} disabled={pending || done}>
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
