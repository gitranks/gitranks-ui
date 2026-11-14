'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';

/** What a new account reads while GitRanks sets up its account, before Learn can answer for it. */
export const LEARN_SETTING_UP_TEXT = 'Setting up your GitRanks account. This takes about a minute.';

/** "Refresh": reads the page again, so the setup line goes once the account is ready. */
export function LearnSetupRefresh({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? (
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      ) : (
        <RefreshCw aria-hidden="true" className="size-4" />
      )}
      Refresh
    </Button>
  );
}

/**
 * The account is being set up (a new GitHub account GitRanks has not read yet): Learn's own pages say so in place of
 * what they cannot show until then, with a refresh.
 */
export function LearnSettingUp() {
  return (
    <section
      aria-live="polite"
      data-learn-setting-up=""
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-brand-soft px-5 py-4"
    >
      <p className="flex min-w-0 items-center gap-2 text-sm">
        <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-muted-foreground" />
        <span>{LEARN_SETTING_UP_TEXT}</span>
      </p>
      <LearnSetupRefresh className="shrink-0" />
    </section>
  );
}
