'use client';

import { useState, useTransition } from 'react';

import { hidePrNote } from '../actions';
import { Panel } from './primitives';
import { Button } from '@/components/ui/button';
import type { ContributePrNote, ContributePrNotes } from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { dayLabel } from '@/lib/contribute/format';
import { likeLabelOf, ROLE_WORDS } from '@/lib/contribute/pr-feedback';
import { cn } from '@/lib/utils';

/** One note: their word (from maintainers and collaborators alone), then who, their role, when and what they liked. */
function Note({ note, onHide, pending }: { note: ContributePrNote; onHide: () => void; pending: boolean }) {
  const meta = [
    note.login,
    ROLE_WORDS[note.role].toLowerCase(),
    dayLabel(note.at),
    note.likes.length ? `liked: ${note.likes.map(likeLabelOf).join(', ').toLowerCase()}` : null,
  ].filter(Boolean);
  return (
    <li data-note={note.feedbackId} className="flex flex-col gap-1 border-t pt-3 first:border-t-0 first:pt-0">
      {note.word ? <blockquote className="border-l-2 pl-3 text-sm break-words">“{note.word}”</blockquote> : null}
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground">{meta.join(' · ')}</p>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="shrink-0 max-sm:min-h-11"
          disabled={pending}
          onClick={onHide}
        >
          Hide
        </Button>
      </div>
    </li>
  );
}

/**
 * "From the maintainers" in the contribution's rail: the "this PR helped" notes on its pull request, newest first. Each
 * can be hidden; hidden ones are counted in a line, to show again. Nothing without a note: a maintainer's stop is the
 * header's to say.
 */
export function PrNotesPanel({ notes: read, className }: { notes: ContributePrNotes; className?: string }) {
  const [notes, setNotes] = useState(read.notes);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const shown = notes.filter(({ hidden }) => !hidden);
  const hidden = notes.filter(({ hidden }) => hidden);

  /** Hides or shows each note in turn, stopping at the first that fails. */
  const setHidden = (feedbackIds: string[], value: boolean) =>
    startTransition(async () => {
      setError(null);
      for (const feedbackId of feedbackIds) {
        const result = await hidePrNote(feedbackId, value);
        if (!result.ok) {
          setError(contributeErrorMessage(result.error, result.message));
          return;
        }
        setNotes((current) => current.map((note) => (note.feedbackId === feedbackId ? result.data : note)));
      }
    });

  if (!notes.length) return null;
  return (
    <Panel data-pr-notes="" aria-labelledby="pr-notes-title" className={cn('gap-3 p-3 sm:p-3', className)}>
      <h2 id="pr-notes-title" className="text-sm font-semibold">
        From the maintainers
      </h2>
      {shown.length ? (
        <ul className="flex flex-col gap-3">
          {shown.map((note) => (
            <Note
              key={note.feedbackId}
              note={note}
              pending={pending}
              onHide={() => setHidden([note.feedbackId], true)}
            />
          ))}
        </ul>
      ) : null}
      {hidden.length ? (
        <p className="text-xs text-muted-foreground" data-hidden-notes={hidden.length}>
          {hidden.length} hidden ·{' '}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-xs text-link"
            disabled={pending}
            onClick={() =>
              setHidden(
                hidden.map(({ feedbackId }) => feedbackId),
                false,
              )
            }
          >
            Show
          </Button>
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}
