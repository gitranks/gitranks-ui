'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { sendBackToAgent } from '../actions';
import { Panel } from './primitives';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { SEND_BACK_NOTE_MAX } from '@/lib/contribute/mcp-setup';

/**
 * "Send back to my agent": a change made by the user's own agent goes back to it with what to change. It reads the
 * note on its next call and submits again. At most a few times a change, within the seven days an issue can be held.
 */
export function SendBackForm({ attemptId, left }: { attemptId: string; left: number }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const send = () =>
    startTransition(async () => {
      setMessage(null);
      const result = await sendBackToAgent(attemptId, note);
      if (!result.ok) {
        setMessage(contributeErrorMessage(result.error, result.message));
        return;
      }
      setNote('');
      router.refresh();
    });

  if (left <= 0) {
    return (
      <Panel className="gap-2 p-4.5">
        <h2 className="text-base font-semibold">Send back to my agent</h2>
        <p className="text-sm text-muted-foreground">
          It was sent back as many times as it can be. Submit it as it is, or discard it.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="gap-2.5 p-4.5">
      <h2 className="text-base font-semibold">Send back to my agent</h2>
      <p className="text-sm text-muted-foreground">
        Say what to change. Your agent reads it on its next call and submits again. {left} more time
        {left === 1 ? '' : 's'} for this change.
      </p>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={SEND_BACK_NOTE_MAX}
          rows={4}
          aria-label="What your agent should change"
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        />
        <div>
          <button
            type="submit"
            disabled={pending || !note.trim()}
            className="min-h-10 rounded-lg border bg-background px-3.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {pending ? 'Sending…' : 'Send back to my agent'}
          </button>
        </div>
        {message ? (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {message}
          </p>
        ) : null}
      </form>
    </Panel>
  );
}
