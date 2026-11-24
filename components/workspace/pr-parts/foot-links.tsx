'use client';

import { useId, useState } from 'react';

/**
 * The quiet line at the foot of a pull request's page: the repository's rules for pull requests, one line that opens
 * to them; "Discard this fix" while there is no pull request; "Close this pull request" while it is open. Each is left
 * out when the page does not give it.
 */
export function PullRequestFootLinks({
  rules,
  onDiscard,
  onClose,
  initialOpen = false,
}: {
  rules: string | null;
  onDiscard?: () => void;
  onClose?: () => void;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const id = useId();
  const links = [
    rules ? (
      <button
        key="rules"
        type="button"
        aria-expanded={open}
        aria-controls={id}
        className="hover:underline"
        onClick={() => setOpen((was) => !was)}
      >
        The project’s rules for pull requests
      </button>
    ) : null,
    onDiscard ? (
      <button key="discard" type="button" className="hover:underline" onClick={onDiscard}>
        Discard this fix
      </button>
    ) : null,
    onClose ? (
      <button key="close" type="button" className="hover:underline" onClick={onClose}>
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
