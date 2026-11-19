import { Loader2 } from 'lucide-react';

import { SettingUpAutoRefresh } from './setting-up-refresh';
import { LearnSetupRefresh } from '@/app/learn/components/learn-setting-up';

export const SETTING_UP_TITLE = 'Setting up your GitRanks account';
export const NO_PROFILE_TITLE = "We couldn't set up your GitRanks account yet";
export const SETTING_UP_TEXT =
  'GitRanks is reading your GitHub profile for the first time. This takes about a minute, and this page updates by itself.';

/**
 * Contribute's home while the viewer's account is being set up (a new GitHub account GitRanks has not read yet): what
 * happens, a refresh, and the page reading itself again until the account is ready.
 */
export function ContributeSettingUp() {
  return (
    <section
      role="status"
      data-contribute-setting-up=""
      className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-primary/20 bg-brand-soft px-6 py-6"
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-primary">GitRanks Contribute</span>
      <h1 className="flex items-center gap-2.5 text-2xl leading-tight font-bold text-balance">
        <Loader2 aria-hidden="true" className="size-5 shrink-0 text-muted-foreground motion-safe:animate-spin" />
        {SETTING_UP_TITLE}
      </h1>
      <p className="text-base leading-normal text-foreground/80">{SETTING_UP_TEXT}</p>
      <LearnSetupRefresh className="self-start" />
      <SettingUpAutoRefresh />
    </section>
  );
}

/**
 * Contribute's home for a signed-in account GitRanks has no profile of, with none on its way (its first read failed
 * or is held for now): what happened, and a refresh, which asks the read again once it may.
 */
export function ContributeNoProfile() {
  return (
    <section
      data-contribute-no-profile=""
      className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-border bg-card px-6 py-6"
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-primary">GitRanks Contribute</span>
      <h1 className="text-2xl leading-tight font-bold text-balance">{NO_PROFILE_TITLE}</h1>
      <p className="text-base leading-normal text-foreground/80">
        GitRanks couldn&apos;t read your GitHub profile just now, so Contribute can&apos;t open for your account yet.
        Try again later.
      </p>
      <LearnSetupRefresh className="self-start" />
    </section>
  );
}
