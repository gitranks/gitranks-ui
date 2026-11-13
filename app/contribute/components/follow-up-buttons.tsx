'use client';

import { TriangleAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import { fixPullRequest, markNeedsYouHandled, retryAttempt, vetoAutopilot } from '../actions';
import { attemptHref } from './reviews-ready';
import { offOf, useSessionActions } from './session-actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { timeLabel } from '@/lib/contribute/attempt-format';
import type { ContributePrSignalKind, ContributeRetry, ContributeRetryKind } from '@/lib/contribute/contribute.types';
import { attemptActionErrorMessage, retryErrorMessage } from '@/lib/contribute/errors';
import { FOLLOW_UP_NOTE_MAX, handledErrorMessage, vetoErrorMessage } from '@/lib/contribute/follow-up-format';
import { relativeLabel } from '@/lib/contribute/format';
import { cn } from '@/lib/utils';

const ErrorNote = ({ error }: { error: string | null }) =>
  error ? (
    <span role="alert" className="text-sm text-destructive">
      {error}
    </span>
  ) : null;

/** What the note's hint says by default: a follow-up's agent puts it over the comments on the pull request. */
const FOLLOW_UP_NOTE_HINT =
  'Your note comes first: where it and a comment on the pull request disagree, the agent follows yours.';

/**
 * The user's optional note to a run's agent: what they think is wrong, or what to focus on. The agent reads it first
 * (a follow-up's, over the comments on the pull request). At most `FOLLOW_UP_NOTE_MAX` characters. `hint` says what
 * the note weighs; `inputClassName` styles the box (its own background, say, on a tinted block).
 */
export function FollowUpNote({
  id,
  label,
  placeholder,
  value,
  onChange,
  disabled,
  hint = FOLLOW_UP_NOTE_HINT,
  inputClassName,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
  inputClassName?: string;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5" data-follow-up-note="">
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
        className={cn('min-h-20', inputClassName)}
      />
      <span className="flex justify-between gap-3 text-xs text-muted-foreground">
        <span id={`${id}-hint`}>{hint}</span>
        <span id={`${id}-count`} aria-live="polite" className="shrink-0 font-mono tabular-nums">
          {value.length.toLocaleString('en-US')} / {FOLLOW_UP_NOTE_MAX.toLocaleString('en-US')}
        </span>
      </span>
    </div>
  );
}

/** Who may be on a taken issue, in running text: "@a", "@a and @b", "@a, @b and @c". */
const takenByText = (logins: readonly string[]) => {
  const named = logins.slice(0, 3).map((login) => `@${login}`);
  return named.length > 1 ? `${named.slice(0, -1).join(', ')} and ${named.at(-1)}` : (named[0] ?? '');
};

/** The retry's words, by its kind: the button, the line under it, and the note's placeholder. */
const RETRY_COPY: Record<ContributeRetryKind, { label: string; line: string; placeholder: string }> = {
  BOOST: {
    label: 'Retry with a bigger check budget',
    line: 'Once: the agent checks the issue again with twice the budget and time, as your limits allow.',
    placeholder: 'Anything it should know? For example: skip the full test suite, the bug is in one file.',
  },
  OVERRIDE: {
    label: 'Work on it anyway',
    line: 'Once: a new run checks the issue again, told you overrode this no-go. You approve its pull request yourself.',
    placeholder: 'Why go ahead? For example: the maintainer invited anyone, not one person.',
  },
};

/**
 * A stop tried again, once, as its `retry` says, with the user's note to the agent: a check that ran out, on twice the
 * budget (`BOOST`), or a no-go the user overrules (`OVERRIDE`): a new run told so, whose pull request they approve
 * themselves. Over a taken no-go (`release`), a line says who may be on it. Opens the new attempt.
 */
export function RetryButton({
  attemptId,
  retry,
  release,
}: {
  attemptId: string;
  retry: ContributeRetry;
  release?: string | null;
}) {
  const router = useRouter();
  const actions = useSessionActions();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const off = pending || done || offOf(actions);
  const override = retry.kind === 'OVERRIDE';
  const copy = RETRY_COPY[retry.kind];
  const taken = override && release === 'taken';

  const click = () =>
    startTransition(async () => {
      setError(null);
      const result = await retryAttempt(attemptId, note);
      if (!result.ok) {
        setError(retryErrorMessage(result.error, result.message));
        return;
      }
      setDone(true);
      router.push(attemptHref(result.data.attemptId));
    });

  return (
    <div
      className="flex flex-col gap-3"
      data-retry={retry.kind}
      {...(override ? { 'data-work-anyway': attemptId } : {})}
    >
      <FollowUpNote
        id={`retry-note-${attemptId}`}
        label="A note for the agent"
        placeholder={copy.placeholder}
        hint="Your note comes first: the agent follows it within the rules and limits."
        value={note}
        onChange={setNote}
        disabled={off}
        inputClassName="bg-background"
      />
      <div className="flex flex-col items-start gap-1.5" {...(override ? {} : { 'data-retry-check': attemptId })}>
        <Button type="button" size="lg" onClick={click} disabled={off} className="min-h-11 px-4 font-semibold">
          {pending || done ? 'Queueing…' : copy.label}
        </Button>
        <span className="text-xs text-muted-foreground">{copy.line}</span>
        {taken ? (
          <p data-taken-warning={retry.takenBy.length} className="flex items-start gap-1.5 text-xs text-foreground/80">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-warning" />
            <span>
              {retry.takenBy.length ? `${takenByText(retry.takenBy)} may be` : 'Someone may be'} working on this. The
              pull request opens under your GitHub account.
            </span>
          </p>
        ) : null}
        <ErrorNote error={error} />
      </div>
    </div>
  );
}

/**
 * "Mark as handled": the user took care of what the pull request's reads found, so it leaves Needs you. `kinds`: only
 * those ("I've done it" on one card); `all` when they are every signal on it, so an API that does not take `kinds`
 * yet clears the same. Something new on it raises it again. `link`: a small link-like button, under a row's action.
 */
export function MarkHandledButton({
  prId,
  prNumber,
  kinds,
  all = false,
  label = 'Mark as handled',
  look = 'outline',
}: {
  prId: string;
  prNumber?: number;
  kinds?: ContributePrSignalKind[];
  all?: boolean;
  label?: string;
  /** `primary`: the card's main button ("Keep it open"). */
  look?: 'outline' | 'large' | 'link' | 'primary';
}) {
  const router = useRouter();
  const actions = useSessionActions();
  const [error, setError] = useState<string | null>(null);
  /** It went through: the button stays off until the page reads again. */
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const off = pending || done || offOf(actions);

  const click = () =>
    startTransition(async () => {
      setError(null);
      const result = await markNeedsYouHandled(prId, kinds && !all ? kinds : undefined);
      if (!result.ok) {
        setError(handledErrorMessage(result.error, result.message));
        return;
      }
      setDone(true);
      router.refresh();
    });

  const text = pending || done ? 'Marking…' : label;
  const aria = prNumber ? `${label} on pull request #${prNumber}` : undefined;
  return (
    <div
      className={cn('flex flex-col gap-1.5', look === 'link' ? 'items-end max-sm:items-start' : 'items-start')}
      data-mark-handled={prId}
      data-kinds={kinds?.join(',')}
    >
      {look === 'link' ? (
        <button
          type="button"
          onClick={click}
          disabled={off}
          aria-label={aria}
          className="inline-flex min-h-6 items-center text-xs font-semibold text-link hover:underline disabled:opacity-60 max-sm:min-h-11"
        >
          {text}
        </button>
      ) : (
        <Button
          type="button"
          variant={look === 'primary' ? 'default' : 'outline'}
          size={look === 'large' || look === 'primary' ? 'lg' : 'sm'}
          onClick={click}
          disabled={off}
          aria-label={aria}
          className={look === 'large' || look === 'primary' ? 'min-h-11 px-4 font-semibold' : undefined}
        >
          {text}
        </Button>
      )}
      <ErrorNote error={error} />
    </div>
  );
}

/**
 * "Sign off and push": GitRanks rewrites our commits on the pull request's branch with the user's DCO sign-off (the
 * same code, a force-push). The click is their consent to sign off. Disabled while a sign-off is on its way.
 */
export function SignOffButton({
  attemptId,
  sending,
  again,
  primary = true,
}: {
  attemptId: string;
  sending: boolean;
  again: boolean;
  /** The view's main action; else an outline one beside it. */
  primary?: boolean;
}) {
  const router = useRouter();
  const actions = useSessionActions();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const click = () =>
    startTransition(async () => {
      setError(null);
      const result = await fixPullRequest({ attemptId, kind: 'SIGN_OFF' });
      if (!result.ok) {
        setError(attemptActionErrorMessage(result.error, result.message));
        return;
      }
      router.refresh();
    });

  return (
    <div className="flex flex-col items-start gap-1.5" data-sign-off={attemptId}>
      <Button
        type="button"
        size="lg"
        variant={primary ? 'default' : 'outline'}
        onClick={click}
        disabled={pending || sending || offOf(actions)}
        className="min-h-11 px-4 font-semibold"
      >
        {pending || sending ? 'Signing off…' : again ? 'Try the sign-off again' : 'Sign off and push'}
      </Button>
      <ErrorNote error={error} />
    </div>
  );
}

/**
 * A link to GitHub that first puts `copy` on the clipboard: the comment that signs an agreement, to paste there. The
 * link opens either way; it says "Copied" once the clipboard took it, and the row's move shows the comment whole, to
 * copy by hand when the clipboard refuses.
 */
export function CopyAndOpenLink({
  href,
  copy,
  label,
  className,
  ariaLabel,
}: {
  href: string;
  copy: string;
  label: string;
  className?: string;
  ariaLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        className={className}
        data-copy-and-open=""
        onClick={() => {
          navigator.clipboard
            ?.writeText(copy)
            .then(() => setCopied(true))
            .catch(() => setCopied(false));
        }}
      >
        {copied ? 'Copied: paste it on GitHub ↗' : label}
      </a>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? 'The comment is copied' : ''}
      </span>
    </>
  );
}

/** Stops autopilot from submitting the attempt: it comes to the review instead. The countdown card's main button. */
export function StopAutopilotButton({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const actions = useSessionActions();
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
        size="lg"
        onClick={click}
        disabled={pending || done || offOf(actions)}
        className="min-h-11 px-4 font-semibold"
      >
        {pending || done ? 'Stopping…' : 'Stop and review'}
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
