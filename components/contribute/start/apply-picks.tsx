'use client';

import { useEffect, useRef, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { dropFlowQuery } from '@/components/workspace/getting-in/drop-query';
import { savePreferences } from '@/lib/contribute/actions';
import { hasPicks, workPicksOf } from '@/lib/contribute/start-flow';

/**
 * What a visitor picked on step 1, applied once from the browser after the sign-in brought them back here (§6.2): saved
 * when the account has no preferences yet, never over saved ones; either way the picks then leave the address. A failed
 * save says so in one quiet line with Try again, the picks kept in the address; the cards work meanwhile. A page load
 * never writes on the server.
 */
export function ApplyWorkPicks({ saved }: { saved: boolean }) {
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  const ran = useRef(false);

  const apply = () =>
    startTransition(async () => {
      const picks = workPicksOf(new URLSearchParams(window.location.search));
      if (saved || !hasPicks(picks)) {
        if (window.location.search) dropFlowQuery();
        return;
      }
      const result = await savePreferences({ languages: picks.languages }).catch(() => null);
      setFailed(!result?.ok);
      if (result?.ok) dropFlowQuery();
    });

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    apply();
  });

  if (!failed) return null;
  return <PicksNotSaved pending={pending} onRetry={apply} />;
}

/** The picks' save failed: one quiet line with Try again. */
export function PicksNotSaved({ pending, onRetry }: { pending: boolean; onRetry: () => void }) {
  return (
    <p role="status" className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground" data-picks="unsaved">
      Your picks from step 1 could not be saved.
      <Button
        type="button"
        variant="link"
        disabled={pending}
        onClick={onRetry}
        className="h-auto p-0 font-semibold text-link"
      >
        Try again
      </Button>
    </p>
  );
}
