'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { retryContributeSetup } from '@/lib/workspace/setup.actions';

/** Under "Try again" when the read did not start: too soon after the last one, or GitRanks did not answer. */
export const SETUP_RETRY_LATER = 'It did not start this time. Try again in a few minutes.';

/**
 * "Try again" after a failed first read: asks the read again, then reads the page again, which shows the setting-up
 * panel while the read is on its way. A read that did not start leaves a line under the button.
 */
export function SetupRetry({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [later, setLater] = useState(false);
  const retry = () => {
    setLater(false);
    startTransition(async () => {
      const result = await retryContributeSetup();
      if (result.ok && result.data !== 'failed') {
        startTransition(() => router.refresh());
        return;
      }
      setLater(true);
    });
  };
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Button type="button" className="self-start" disabled={pending} onClick={retry} data-setup-retry="">
        {pending ? (
          <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
        ) : (
          <RefreshCw aria-hidden="true" className="size-4" />
        )}
        Try again
      </Button>
      {later ? (
        <p role="status" className="text-sm text-muted-foreground">
          {SETUP_RETRY_LATER}
        </p>
      ) : null}
    </div>
  );
}
