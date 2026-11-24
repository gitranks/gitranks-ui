import { Loader2 } from 'lucide-react';

import { SettingUpAutoRefresh } from './setting-up-refresh';
import { LearnSetupRefresh } from '@/components/workspace/setup-refresh';

export const SETTING_UP_TITLE = 'Setting up your GitRanks account';
export const NO_PROFILE_TITLE = 'Not open to your GitHub account';
/**
 * The one case where a later try helps. The no-profile panels reach an account whose first read failed or waits, and one
 * GitRanks does not read at all: the API does not tell the two apart, so nothing says "just now".
 */
const NO_PROFILE_NEW_ACCOUNT = 'If your account is new, try again in an hour.';
export const SETTING_UP_TEXT =
  'GitRanks is reading your GitHub profile for the first time. This takes about a minute, and this page updates by itself.';

/** Which side's page a panel stands on: its eyebrow names it. */
export type SetupProduct = 'Contribute' | 'Learn';

/**
 * Contribute's home (or a step of Learn's flow, `product`) while the viewer's account is being set up (a new GitHub
 * account GitRanks has not read yet): what happens, a refresh, and the page reading itself again until it is ready.
 */
export function ContributeSettingUp({ product = 'Contribute' }: { product?: SetupProduct }) {
  return (
    <section
      role="status"
      data-contribute-setting-up=""
      className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-primary/20 bg-brand-soft px-6 py-6"
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-primary">GitRanks {product}</span>
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
 * Contribute's home (or a step of Learn's flow, `product`) for a signed-in account GitRanks has no profile of, with
 * none on its way (its first read failed or is held for now, or GitRanks does not read the account): what is so, and a
 * refresh, which asks the read again once it may.
 */
export function ContributeNoProfile({ product = 'Contribute' }: { product?: SetupProduct }) {
  return (
    <section
      data-contribute-no-profile=""
      className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-border bg-card px-6 py-6"
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-primary">GitRanks {product}</span>
      <h1 className="text-2xl leading-tight font-bold text-balance">{NO_PROFILE_TITLE}</h1>
      <p className="text-base leading-normal text-foreground/80">
        GitRanks has not read your GitHub account, so {product} is not open to it. {NO_PROFILE_NEW_ACCOUNT}
      </p>
      <LearnSetupRefresh className="self-start" />
    </section>
  );
}
