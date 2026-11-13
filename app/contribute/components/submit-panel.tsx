'use client';

import { type ReactNode, useEffect, useId, useRef } from 'react';

import { useSessionActions } from './session-actions';
import { Button } from '@/components/ui/button';

/**
 * The pull request's form (M6), closed until the review card opens it ("Write the pull request", "Try again"), and
 * open with the page after a submit that bounced or on the way back from GitHub's access screen. Its open state is the
 * session's, so the card and the form agree. It is rendered closed too, so its own work (the way back from GitHub)
 * runs either way. While it is open, "Hide the pull request" closes it.
 */
export function SubmitPanel({ children }: { children: ReactNode }) {
  const form = useSessionActions()?.form ?? null;
  const open = form?.open ?? false;
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const opened = useRef(open);

  // Opened by the user, the title takes the focus (unless the opener moved it already); opened with the page, nothing.
  useEffect(() => {
    if (open && !opened.current && !panel.current?.contains(document.activeElement)) {
      panel.current?.querySelector<HTMLElement>('input, textarea')?.focus({ preventScroll: true });
    }
    opened.current = open;
  }, [open]);

  return (
    <div data-submit-panel={open ? 'open' : 'closed'} className="flex flex-col gap-3">
      {open && form ? (
        <Button
          type="button"
          size="lg"
          variant="outline"
          aria-expanded
          aria-controls={id}
          onClick={() => form.setOpen(false)}
          className="self-start"
        >
          Hide the pull request
        </Button>
      ) : null}
      <div id={id} ref={panel} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
