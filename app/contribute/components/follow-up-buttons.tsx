'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { startFollowUp, vetoAutopilot } from '../actions';
import { attemptHref } from './reviews-ready';
import { timeLabel } from '@/lib/contribute/attempt-format';
import { followUpErrorMessage, vetoErrorMessage } from '@/lib/contribute/follow-up-format';
import { relativeLabel } from '@/lib/contribute/format';

const ErrorNote = ({ error }: { error: string | null }) =>
  error ? (
    <span role="alert" className="text-sm text-red-700 dark:text-red-400">
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
      <button
        type="button"
        onClick={click}
        disabled={pending || done}
        className="min-h-10 rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {pending || done ? 'Starting…' : 'Start a follow-up'}
      </button>
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
      <button
        type="button"
        onClick={click}
        disabled={pending || done}
        className="min-h-10 rounded-[10px] border border-amber-300 bg-background px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-950"
      >
        {pending || done ? 'Stopping…' : 'Stop'}
      </button>
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
