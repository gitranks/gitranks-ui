'use client';

import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { RESUME_PARAM } from '@/lib/contribute/grant-resume';

/** Opens the pull request's form: "Try again" after a submit that bounced. */
export const OPEN_SUBMIT_EVENT = 'contribute:open-submit';

export const openSubmitForm = () => window.dispatchEvent(new Event(OPEN_SUBMIT_EVENT));

/**
 * The pull request's form behind one button, so the review opens on the change itself. It opens by itself after a
 * submit that bounced (`open`), on the way back from GitHub's access screen, and when "Try again" asks for it. It is
 * rendered closed too, so its own work (the way back from GitHub) runs either way.
 */
export function SubmitPanel({ open: initiallyOpen, children }: { open: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);
  const opened = useRef(initiallyOpen);

  useEffect(() => {
    // Back from GitHub the form opens with the page: nothing moves the focus.
    if (new URLSearchParams(window.location.search).has(RESUME_PARAM)) {
      opened.current = true;
      setOpen(true);
    }
    const show = () => setOpen(true);
    window.addEventListener(OPEN_SUBMIT_EVENT, show);
    return () => window.removeEventListener(OPEN_SUBMIT_EVENT, show);
  }, []);

  // Opened by the user, the title takes the focus; opened with the page, nothing moves it.
  useEffect(() => {
    if (open && !opened.current) panel.current?.querySelector<HTMLElement>('input, textarea')?.focus();
    opened.current = open;
  }, [open]);

  return (
    <div data-submit-panel={open ? 'open' : 'closed'} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="lg"
          variant={open ? 'outline' : 'default'}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Hide the pull request' : 'Write the pull request…'}
        </Button>
        {open ? null : (
          <span className="text-sm text-muted-foreground">Its title and text, then submit or discard.</span>
        )}
      </div>
      <div id={id} ref={panel} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
