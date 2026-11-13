'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useState, useTransition } from 'react';

import {
  approveContributeProof,
  discardContributeProof,
  postContributeProofReply,
  retryContributeProof,
  sendBackContributeProof,
  startFollowUp,
  takeBackContributeProof,
} from '../actions';
import { offOf, useSessionActions } from './session-actions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { holdFastChanges } from '@/lib/contribute/changes-bus';
import { attemptActionErrorMessage, type ContributeActionResult } from '@/lib/contribute/errors';
import { PROOF_NOTE_MAX, PROOF_REPLY_MAX } from '@/lib/contribute/proof';
import { attemptPath } from '@/lib/contribute/sessions';

const BIG = 'min-h-11 px-4 font-semibold';

/** While the proof waits on the agent, the page asks for news often: the card moves on by itself. */
export function ProofPoll() {
  useEffect(() => holdFastChanges(), []);
  return null;
}

/** One action at a time: its error under the buttons, and the page read again once it went through. */
function useProofAction() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();
  const act = (call: () => Promise<ContributeActionResult<unknown>>, then?: () => void) =>
    startTransition(async () => {
      setError(null);
      const result = await call();
      if (!result.ok) {
        setError(attemptActionErrorMessage(result.error, result.message));
        return;
      }
      setDone(true);
      if (then) then();
      else router.refresh();
    });
  const actions = useSessionActions();
  return { act, error, busy: pending || done || offOf(actions), router };
}

function ErrorLine({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="text-sm text-destructive">
      {error}
    </p>
  ) : null;
}

/** A note for the agent, sent back with the proof: the same prompt picks it up again. */
function SendBackNote({ id, label, onCancel }: { id: string; label: string; onCancel: () => void }) {
  const field = useId();
  const [note, setNote] = useState('');
  const { act, error, busy } = useProofAction();
  return (
    <form
      className="flex flex-col gap-2"
      data-proof-send-back=""
      onSubmit={(event) => {
        event.preventDefault();
        act(() => sendBackContributeProof(id, note));
      }}
    >
      <label htmlFor={field} className="text-sm font-medium">
        What should your agent change?
      </label>
      <Textarea
        id={field}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={PROOF_NOTE_MAX}
        rows={3}
        className="field-sizing-fixed rounded-lg text-sm"
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" variant="outline" size="lg" disabled={busy || !note.trim()} className={BIG}>
          {busy ? 'Sending…' : label}
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={onCancel} disabled={busy} className={BIG}>
          Cancel
        </Button>
      </div>
      <ErrorLine error={error} />
    </form>
  );
}

function DiscardButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const { act, error, busy } = useProofAction();
  return (
    <span className="flex flex-col gap-1.5">
      <Button
        type="button"
        variant="ghost"
        size="lg"
        onClick={() => act(() => discardContributeProof(id))}
        disabled={busy || disabled}
        className={BIG}
      >
        {busy ? 'Discarding…' : 'Discard'}
      </Button>
      <ErrorLine error={error} />
    </span>
  );
}

/**
 * The proof checked, then posted: "Post the proof" waits for the tick that nothing private is left. Send back takes a
 * note; Discard drops it.
 */
export function ProofReviewActions({ id, redactions }: { id: string; redactions: string[] }) {
  const tick = useId();
  const [checked, setChecked] = useState(false);
  const [sendingBack, setSendingBack] = useState(false);
  const { act, error, busy } = useProofAction();
  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex flex-col gap-2.5 rounded-lg border border-warning/40 bg-warning-soft px-4 py-3 text-sm"
        data-proof-redaction=""
      >
        <p>
          <span className="font-semibold">Read it before it goes public.</span> Look for API keys, tokens, IPs, emails,
          phone numbers and private URLs, in the screenshots too.{' '}
          <span className="text-muted-foreground">
            {redactions.length
              ? `Your agent says it removed ${redactions.join(', ')}.`
              : 'Your agent says it removed nothing.'}{' '}
            Once posted, it can't be taken back: the screenshots stay reachable by their commit even after the branch is
            deleted.
          </span>
        </p>
        <label htmlFor={tick} className="flex min-h-11 items-center gap-3 font-medium">
          <input
            id={tick}
            type="checkbox"
            className="size-4 accent-primary"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
            disabled={busy}
          />
          I've checked it: nothing private is left
        </label>
      </div>
      {sendingBack ? (
        <SendBackNote id={id} label="Send back to your agent" onCancel={() => setSendingBack(false)} />
      ) : (
        <div className="flex flex-wrap items-start gap-3">
          <Button
            type="button"
            size="lg"
            onClick={() => act(() => approveContributeProof(id, checked))}
            disabled={busy || !checked}
            className={BIG}
            data-proof-post=""
          >
            {busy ? 'Posting…' : 'Post the proof'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setSendingBack(true)}
            disabled={busy}
            className={BIG}
          >
            Send back to your agent
          </Button>
          <DiscardButton id={id} disabled={busy} />
        </div>
      )}
      <ErrorLine error={error} />
      {!sendingBack ? (
        <p className="text-xs text-muted-foreground">
          Post the proof waits for the tick above. Send back takes a note, and the same prompt picks it up again.
        </p>
      ) : null}
    </div>
  );
}

/** The agent could not capture it: the reply it drafted, edited, then posted on the pull request; or another try. */
export function ProofReplyActions({ id, reply, prNumber }: { id: string; reply: string; prNumber: number }) {
  const field = useId();
  const [text, setText] = useState(reply);
  const [sendingBack, setSendingBack] = useState(false);
  const { act, error, busy } = useProofAction();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex w-full flex-col gap-1.5">
        <label htmlFor={field} className="text-sm font-medium">
          A reply for the pull request, written by your agent
        </label>
        <Textarea
          id={field}
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={PROOF_REPLY_MAX}
          rows={7}
          disabled={busy}
          className="rounded-lg text-sm"
        />
        <span className="text-xs text-muted-foreground">
          It goes on #{prNumber} as your comment, with the repository's AI marker. Edit it as you like.
        </span>
      </div>
      {sendingBack ? (
        <SendBackNote id={id} label="Try again with this note" onCancel={() => setSendingBack(false)} />
      ) : (
        <div className="flex flex-wrap items-start gap-3">
          <Button
            type="button"
            size="lg"
            onClick={() => act(() => postContributeProofReply(id, text))}
            disabled={busy || !text.trim()}
            className={BIG}
          >
            {busy ? 'Posting…' : 'Post the reply'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setSendingBack(true)}
            disabled={busy}
            className={BIG}
          >
            Try again with a note
          </Button>
          <DiscardButton id={id} disabled={busy} />
        </div>
      )}
      <ErrorLine error={error} />
    </div>
  );
}

/**
 * The agent found the fix itself doesn't work: the next run starts with its note (editable), and the proof ends. A
 * pull request a run can't take (one under way, or closed) says so.
 */
export function ProofFixBrokenActions({
  id,
  prId,
  round,
  note,
  runOpen,
}: {
  id: string;
  prId: string;
  round: number;
  note: string;
  runOpen: boolean;
}) {
  const field = useId();
  const [text, setText] = useState(note);
  const { act, error, busy, router } = useProofAction();
  // The run started but the proof was not discarded: said, with the way to the run, and Discard left to click.
  const [started, setStarted] = useState<{ runId: string; error: string } | null>(null);
  const start = () =>
    act(
      async () => {
        const run = await startFollowUp(prId, undefined, text);
        if (!run.ok) return run;
        const discarded = await discardContributeProof(id).catch(
          (): ContributeActionResult<never> => ({ ok: false, error: 'FAILED' }),
        );
        if (!discarded.ok) {
          setStarted({
            runId: run.data.attemptId,
            error: attemptActionErrorMessage(discarded.error, discarded.message),
          });
          return { ok: true, data: null };
        }
        router.push(attemptPath(run.data.attemptId));
        return run;
      },
      () => {},
    );
  return (
    <div className="flex flex-col gap-3">
      {runOpen ? (
        <div className="flex w-full flex-col gap-1.5">
          <label htmlFor={field} className="text-sm font-medium">
            The note for run {round}
          </label>
          <Textarea
            id={field}
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            disabled={busy}
            className="rounded-lg text-sm"
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-start gap-3">
        {runOpen && !started ? (
          <Button type="button" size="lg" onClick={start} disabled={busy || !text.trim()} className={BIG}>
            {busy ? 'Starting…' : `Start run ${round} with this note`}
          </Button>
        ) : null}
        <DiscardButton id={id} disabled={busy && !started} />
      </div>
      <ErrorLine error={error} />
      {started ? (
        <p role="alert" className="text-sm text-destructive" data-proof-discard-failed="">
          Run {round} started, but this proof wasn't discarded: {started.error}{' '}
          <a href={attemptPath(started.runId)} className="font-semibold text-link">
            Go to run {round} →
          </a>
        </p>
      ) : null}
    </div>
  );
}

/** Back with nothing this page can show: send it back with a note, or drop it. */
export function ProofUnreadableActions({ id }: { id: string }) {
  const [sendingBack, setSendingBack] = useState(false);
  return sendingBack ? (
    <SendBackNote id={id} label="Send back to your agent" onCancel={() => setSendingBack(false)} />
  ) : (
    <div className="flex flex-wrap items-start gap-3">
      <Button type="button" variant="outline" size="lg" onClick={() => setSendingBack(true)} className={BIG}>
        Send back to your agent
      </Button>
      <DiscardButton id={id} />
    </div>
  );
}

/** Posting failed: try again from the step that failed (nothing posted twice), or drop it. */
export function ProofRetryActions({ id }: { id: string }) {
  const { act, error, busy } = useProofAction();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-start gap-3">
        <Button
          type="button"
          size="lg"
          onClick={() => act(() => retryContributeProof(id))}
          disabled={busy}
          className={BIG}
        >
          {busy ? 'Trying…' : 'Try again'}
        </Button>
        <DiscardButton id={id} disabled={busy} />
      </div>
      <ErrorLine error={error} />
    </div>
  );
}

/** The agent holding the proof is stuck or closed: take it back, then run the prompt again. */
export function ProofTakeBack({ id }: { id: string }) {
  const { act, error, busy } = useProofAction();
  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        onClick={() => act(() => takeBackContributeProof(id))}
        disabled={busy}
        className="font-semibold text-link disabled:opacity-60"
      >
        {busy ? 'Taking it back…' : 'Take it back'}
      </button>
      <ErrorLine error={error} />
    </span>
  );
}
