'use client';

import { useState, useTransition } from 'react';

import { hidePrNote } from '../actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { ContributePrNote, ContributePrNotes } from '@/lib/contribute/contribute.types';
import { contributeErrorMessage } from '@/lib/contribute/errors';
import { fullDayLabel } from '@/lib/contribute/maintainers-format';
import { likeLabelOf, ROLE_WORDS } from '@/lib/contribute/pr-feedback';

/** A maintainer stopped GitRanks work on the PR: nothing of ours writes to it any more. */
export function PrStoppedNotice({ repo }: { repo: string }) {
  return (
    <Alert data-pr-stopped="" className="border-warning/40 bg-warning-soft text-warning-soft-foreground">
      <AlertTitle className="line-clamp-none">GitRanks work on this PR stopped</AlertTitle>
      <AlertDescription className="text-current/90">
        A maintainer of {repo} stopped GitRanks work on this PR. Reply on GitHub yourself if you like.
      </AlertDescription>
    </Alert>
  );
}

/** One note: who, their role, what they liked, their word (from maintainers and collaborators alone), and when. */
function Note({ note, onHide, pending }: { note: ContributePrNote; onHide: () => void; pending: boolean }) {
  return (
    <li data-note={note.feedbackId} className="flex flex-col gap-1.5 border-t pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-sm">
          <span className="font-mono font-medium">{note.login}</span>{' '}
          <span className="text-muted-foreground">
            · {ROLE_WORDS[note.role].toLowerCase()} · {fullDayLabel(note.at)}
          </span>
        </span>
        <Button type="button" variant="ghost" size="sm" className="max-sm:min-h-11" disabled={pending} onClick={onHide}>
          Hide
        </Button>
      </div>
      {note.likes.length ? (
        <p className="text-sm text-muted-foreground">Liked: {note.likes.map(likeLabelOf).join(', ').toLowerCase()}</p>
      ) : null}
      {note.word ? <blockquote className="border-l-2 pl-3 text-sm break-words">{note.word}</blockquote> : null}
    </li>
  );
}

/**
 * "From the maintainers" on the contributor's page: the stop, if a maintainer stopped GitRanks work on the PR, and the
 * "this PR helped" notes, newest first. Each can be hidden; hidden ones stay listed in a line, to show again.
 */
export function PrNotesPanel({ notes: read, repo }: { notes: ContributePrNotes; repo: string }) {
  const [notes, setNotes] = useState(read.notes);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const shown = notes.filter(({ hidden }) => !hidden);
  const hidden = notes.filter(({ hidden }) => hidden);

  const setHidden = (feedbackId: string, value: boolean) =>
    startTransition(async () => {
      setError(null);
      const result = await hidePrNote(feedbackId, value);
      if (result.ok) {
        setNotes((current) => current.map((note) => (note.feedbackId === feedbackId ? result.data : note)));
      } else setError(contributeErrorMessage(result.error, result.message));
    });

  if (!read.stopped && !notes.length) return null;
  return (
    <div className="flex flex-col gap-3" data-pr-notes="">
      {read.stopped ? <PrStoppedNotice repo={repo} /> : null}
      {notes.length ? (
        <section aria-labelledby="pr-notes-title" className="flex flex-col gap-3 rounded-xl border bg-card p-4">
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
                  onHide={() => setHidden(note.feedbackId, true)}
                />
              ))}
            </ul>
          ) : null}
          {hidden.length ? (
            <p className="text-xs text-muted-foreground" data-hidden-notes={hidden.length}>
              Hidden:{' '}
              {hidden.map((note, index) => (
                <span key={note.feedbackId}>
                  {index ? ', ' : null}
                  {note.login}{' '}
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs text-link"
                    disabled={pending}
                    onClick={() => setHidden(note.feedbackId, false)}
                  >
                    Show
                  </Button>
                </span>
              ))}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
