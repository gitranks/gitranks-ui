'use client';

import { useId, useState } from 'react';

import { ConfirmDialog } from '@/components/workspace/confirm-dialog';

/** The foot's buttons: quiet text, the height of the page's other buttons on a phone. */
const FOOT_BUTTON = 'hover:underline disabled:opacity-50 max-sm:min-h-11';

/**
 * The quiet line at the foot of a pull request's page: the repository's rules for pull requests, one line that opens
 * to them; "Discard this fix" while there is no pull request, which asks first; "Close this pull request" while it is
 * open. Each is left out when the page does not give it.
 */
export function PullRequestFootLinks({
  rules,
  onDiscard,
  discarding = false,
  discardError = null,
  onClose,
  initialOpen = false,
}: {
  rules: string | null;
  /** Discards the fix, once the person said yes in the dialog. */
  onDiscard?: () => void;
  /** A call is under way: the discard waits, and the dialog says it discards. */
  discarding?: boolean;
  /** Why the discard failed, in its dialog. */
  discardError?: string | null;
  onClose?: () => void;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const [asking, setAsking] = useState(false);
  const id = useId();
  const links = [
    rules ? (
      <button
        key="rules"
        type="button"
        aria-expanded={open}
        aria-controls={id}
        className={FOOT_BUTTON}
        onClick={() => setOpen((was) => !was)}
      >
        The project’s rules for pull requests
      </button>
    ) : null,
    onDiscard ? (
      <ConfirmDialog
        key="discard"
        trigger={
          <button type="button" className={FOOT_BUTTON} disabled={discarding}>
            Discard this fix
          </button>
        }
        open={asking}
        onOpenChange={setAsking}
        title="Discard this fix?"
        description="Nothing is submitted, and the issue goes back to the pool. What it cost stays spent."
        action="Discard"
        pendingAction="Discarding…"
        pending={discarding}
        error={discardError}
        onConfirm={onDiscard}
      />
    ) : null,
    onClose ? (
      <button key="close" type="button" className={FOOT_BUTTON} onClick={onClose}>
        Close this pull request
      </button>
    ) : null,
  ].filter((link) => link !== null);
  if (!links.length) return null;
  return (
    <div className="flex flex-col gap-2" data-foot-links="">
      <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {links.map((link, index) => (
          <span key={link.key} className="inline-flex items-center gap-2">
            {index ? <span aria-hidden="true">·</span> : null}
            {link}
          </span>
        ))}
      </p>
      {rules ? (
        <p
          id={id}
          hidden={!open}
          className="m-0 rounded-lg border bg-card px-3.5 py-2.5 text-sm whitespace-pre-line text-foreground"
          data-rules=""
        >
          {rules}
        </p>
      ) : null}
    </div>
  );
}
