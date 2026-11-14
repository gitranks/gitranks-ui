'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { LEARN_SETTING_UP_TEXT } from '@/lib/learn/lesson-format';

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
        <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
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
      role="status"
      data-learn-setting-up=""
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-brand-soft px-5 py-4"
    >
      <p className="flex min-w-0 items-center gap-2 text-sm">
        <Loader2 aria-hidden="true" className="size-4 shrink-0 text-muted-foreground motion-safe:animate-spin" />
        <span>{LEARN_SETTING_UP_TEXT}</span>
      </p>
      <LearnSetupRefresh className="shrink-0" />
    </section>
  );
}
