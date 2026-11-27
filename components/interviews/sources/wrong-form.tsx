'use client';

import { signIn } from 'next-auth/react';
import { useEffect, useId, useRef, useState } from 'react';

import { sendWrongReport, type WrongReport } from './report-send';
import { Button } from '@/components/ui/button';
import { IDENTITY_PROVIDER } from '@/lib/auth-providers';
import { REPORT_NOTE_MAX_LENGTH, REPORT_WORDS, reportNoteOf } from '@/lib/interviews/report';
import { hasSessionHint } from '@/lib/session-hint';
import { cn } from '@/lib/utils';

/** Where the short form stands: a visitor's, being written, being sent, refused, or sent. */
type WrongState = 'visitor' | 'writing' | 'sending' | 'limited' | 'failed' | 'sent';

/**
 * The quiet link that opens the short form of "This is wrong" in place, under the facts it is about. It says whether
 * the form is open.
 */
export function WrongLink({
  open,
  onToggle,
  className,
}: Readonly<{ open: boolean; onToggle: () => void; className?: string }>) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className={cn('text-xs text-muted-foreground hover:underline', className)}
    >
      This is wrong
    </button>
  );
}

/**
 * The short form of "This is wrong", opened in place: one question, a note, Send and Cancel. A visitor is asked to
 * sign in instead. Once sent, the form gives way to one line in the same place. `frame`: a line above it inside a
 * round's details (`line`), or a box of its own under a section's facts (`box`).
 */
export function WrongForm({
  report,
  label,
  placeholder,
  frame = 'box',
  onClose,
}: Readonly<{
  report: WrongReport;
  label: string;
  placeholder?: string;
  frame?: 'line' | 'box';
  onClose: () => void;
}>) {
  const [state, setState] = useState<WrongState>(() =>
    typeof document !== 'undefined' && hasSessionHint(document.cookie) ? 'writing' : 'visitor',
  );
  const [note, setNote] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);
  const id = useId();
  const frameClass = frame === 'line' ? 'border-t pt-3' : 'rounded-lg border bg-background p-3';

  // Opened by a press of "This is wrong": the note is where the person types next.
  useEffect(() => {
    field.current?.focus();
  }, []);

  if (state === 'sent') {
    return (
      <p role="status" data-wrong-form="sent" className={cn('m-0 text-sm text-muted-foreground', frameClass)}>
        {REPORT_WORDS.sent}
      </p>
    );
  }

  if (state === 'visitor') {
    return (
      <div data-wrong-form="visitor" className={cn('flex flex-col gap-2', frameClass)}>
        <p className="m-0 text-sm font-medium">{label}</p>
        <p className="m-0 text-sm text-muted-foreground">{REPORT_WORDS.signIn}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            className="font-semibold"
            onClick={() => {
              signIn(IDENTITY_PROVIDER, { redirectTo: `${location.pathname}${location.search}` }).catch(() => {});
            }}
          >
            Sign in with GitHub
          </Button>
          <Button type="button" variant="outline" className="font-semibold" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  const sendable = reportNoteOf(note) !== null && state !== 'sending';
  const send = async () => {
    const sent = reportNoteOf(note);
    if (sent === null) return;
    setState('sending');
    const result = await sendWrongReport(report, sent);
    setState(result === 'signed_out' ? 'visitor' : result === 'sent' ? 'sent' : result);
  };

  return (
    <form
      data-wrong-form={state}
      className={cn('flex flex-col gap-2', frameClass)}
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <textarea
        ref={field}
        id={id}
        rows={3}
        maxLength={REPORT_NOTE_MAX_LENGTH}
        value={note}
        placeholder={placeholder}
        onChange={(event) => setNote(event.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="font-semibold" disabled={!sendable}>
          Send
        </Button>
        <Button type="button" variant="outline" className="font-semibold" onClick={onClose}>
          Cancel
        </Button>
        <span className="text-xs text-muted-foreground">{REPORT_WORDS.hint}</span>
      </div>
      {(state === 'limited' || state === 'failed') && (
        <p role="alert" className="m-0 text-sm text-destructive">
          {REPORT_WORDS[state]}
        </p>
      )}
    </form>
  );
}
