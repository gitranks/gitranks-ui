'use client';

import { Check } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useId, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EnterKey } from '@/components/workspace/masked-issue/facts';
import { cn } from '@/lib/utils';
import { GIVE_BACK_REASONS, OUT_NOTE_MAX } from '@/lib/workspace/masked-issue';
import type { IssueOutReason } from '@/lib/workspace/masked-issue.types';

/**
 * "Not for me": one row under the form, the same in every state, with its two lines and "Give it back". One press
 * gives the issue back, with nothing to fill in first.
 */
export function NotForMe({ onGiveBack, sending = false }: { onGiveBack?: () => void; sending?: boolean }) {
  return (
    <section
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border bg-card p-5"
      aria-labelledby="not-for-me-title"
      data-not-for-me=""
    >
      <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1">
        <h2 id="not-for-me-title" className="m-0 text-lg font-semibold">
          Not for me
        </h2>
        <p className="m-0 text-sm text-muted-foreground">
          Give the issue back. It goes to the others at once, and you are not shown it again.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={sending ? undefined : onGiveBack}
        aria-disabled={sending || undefined}
        className="aria-disabled:opacity-60 max-sm:min-h-11"
      >
        {sending ? 'Giving it back…' : 'Give it back'}
      </Button>
    </section>
  );
}

/** What a save answered: saved, or not (the page says so, and the press can be made again). */
export type SaveResult = Promise<boolean>;

export type GivenBackProps = {
  /** The reasons saved so far. */
  reasons?: IssueOutReason[];
  /** The note saved so far. */
  note?: string | null;
  /** The list the issue came from. */
  backHref: Route;
  /** A reason pressed on or off: saved at once. */
  onReason?: (reason: IssueOutReason, on: boolean) => SaveResult;
  /** "Save the note". */
  onNote?: (note: string) => SaveResult;
  /** A note typed and not saved yet (the catalogue's state). */
  initialDraft?: string;
  /** "Saved." under the reasons from the start (the catalogue's state). */
  initialSaved?: boolean;
};

/**
 * After "Give it back": the issue is given back by the one press; what was wrong with it comes after, and nothing
 * has to be filled in. Each reason is a button that stays pressed and is saved when pressed; the note is saved by its
 * own button. Then "Back to Issues", where the next issue has taken its place.
 */
export function GivenBack({
  reasons: savedReasons = [],
  note: savedNote = null,
  backHref,
  onReason,
  onNote,
  initialDraft,
  initialSaved = false,
}: GivenBackProps) {
  const ids = useId();
  const [reasons, setReasons] = useState<IssueOutReason[]>(savedReasons);
  const [reasonSaid, setReasonSaid] = useState<string>(initialSaved ? 'Saved.' : '');
  const [draft, setDraft] = useState(initialDraft ?? savedNote ?? '');
  const [noteSaved, setNoteSaved] = useState(savedNote ?? '');
  const [noteSaid, setNoteSaid] = useState('');
  const [saving, startSaving] = useTransition();

  /** Sets one reason on or off, leaving the others as they are now. */
  const turn = (reason: IssueOutReason, on: boolean) =>
    setReasons((current) =>
      on ? (current.includes(reason) ? current : [...current, reason]) : current.filter((each) => each !== reason),
    );

  const press = (reason: IssueOutReason) => {
    const on = !reasons.includes(reason);
    turn(reason, on);
    setReasonSaid('');
    void (onReason ? onReason(reason, on).catch(() => false) : Promise.resolve(true)).then((ok) => {
      if (ok) setReasonSaid('Saved.');
      else {
        // Only this reason goes back: another pressed meanwhile keeps its own answer.
        turn(reason, !on);
        setReasonSaid('Not saved. Try again.');
      }
    });
  };

  const text = draft.trim();
  const canSave = text.length > 0 && text !== noteSaved && !saving;
  const saveNote = () =>
    startSaving(async () => {
      const ok = onNote ? await onNote(text).catch(() => false) : true;
      if (ok) setNoteSaved(text);
      setNoteSaid(ok ? 'Saved.' : 'Not saved. Try again.');
    });

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-card p-5" data-given-back="">
      <div className="flex flex-col gap-1">
        <h1 tabIndex={-1} className="m-0 text-2xl font-bold tracking-tight outline-none">
          You gave this issue back
        </h1>
        <p className="m-0 text-sm text-muted-foreground">
          It is with the others again, and you will not be shown it again.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        <span id={`${ids}-reasons`} className="text-sm font-medium">
          What was wrong with it?{' '}
          <span className="font-normal text-muted-foreground">
            Optional. A press is saved at once, and you can press more than one.
          </span>
        </span>
        <fieldset className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0" aria-labelledby={`${ids}-reasons`}>
          {GIVE_BACK_REASONS.map(({ reason, text: words }) => {
            const on = reasons.includes(reason);
            return (
              <button
                key={reason}
                type="button"
                aria-pressed={on}
                onClick={() => press(reason)}
                className={cn(
                  'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium whitespace-nowrap',
                  on ? 'border-foreground bg-foreground text-background' : 'text-foreground hover:bg-accent',
                )}
              >
                {on ? <Check aria-hidden="true" className="size-3" /> : null}
                {words}
              </button>
            );
          })}
        </fieldset>
        <span role="status" className="min-h-4 text-xs text-muted-foreground">
          {reasonSaid}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor={`${ids}-note`} className="text-sm font-medium">
          Anything to add? <span className="font-normal text-muted-foreground">Optional</span>
        </label>
        <Textarea
          id={`${ids}-note`}
          rows={3}
          maxLength={OUT_NOTE_MAX}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setNoteSaid('');
          }}
          placeholder="For example: the maintainers already discuss another fix in the thread"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" disabled={!canSave} onClick={saveNote} className="max-sm:min-h-11">
            {saving ? 'Saving…' : 'Save the note'}
          </Button>
          <span role="status" className="text-xs text-muted-foreground">
            {noteSaid}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t pt-4">
        <Button asChild className="h-10 px-6 font-semibold max-sm:min-h-11">
          <Link href={backHref} prefetch={false} data-primary-action="">
            Back to Issues
            <EnterKey />
          </Link>
        </Button>
        <span className="text-sm text-muted-foreground">The next issue has taken its place.</span>
      </div>
    </section>
  );
}
