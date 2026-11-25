import { Loader2 } from 'lucide-react';

import { SettingUpAutoRefresh } from './setting-up-refresh';
import { SetupRetry } from './setup-retry';
import { LearnSetupRefresh } from '@/components/workspace/setup-refresh';
import type { ContributeSetupState } from '@/lib/workspace/contribute.types';

export const SETTING_UP_TITLE = 'Setting up your GitRanks account';
export const NO_PROFILE_TITLE = 'Not open to your GitHub account';
export const SETUP_FAILED_TITLE = 'We could not set up your GitRanks account';
export const SETTING_UP_TEXT =
  'GitRanks is reading your GitHub profile for the first time. This takes about a minute, and this page updates by itself.';
export const SETUP_FAILED_TEXT = 'GitRanks could not read your GitHub profile. Try again: it takes about a minute.';

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
 * Contribute's home (or a step of Learn's flow, `product`) when the first read of the viewer's account failed: what is
 * so, and "Try again", which asks the read again; the page then shows the setting-up panel.
 */
export function ContributeSetupFailed({ product = 'Contribute' }: { product?: SetupProduct }) {
  return (
    <section
      data-contribute-setup-failed=""
      className="mx-auto flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-border bg-card px-6 py-6"
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-primary">GitRanks {product}</span>
      <h1 className="text-2xl leading-tight font-bold text-balance">{SETUP_FAILED_TITLE}</h1>
      <p className="text-base leading-normal text-foreground/80">{SETUP_FAILED_TEXT}</p>
      <SetupRetry className="self-start" />
    </section>
  );
}

/**
 * Contribute's home (or a step of Learn's flow, `product`) for a signed-in account GitRanks does not read: what is so.
 * Nothing to try: a read would not start.
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
        GitRanks does not read your GitHub account, so {product} is not open to it.
      </p>
    </section>
  );
}

/**
 * The panel for a signed-in account with no Contribute view, by where its setup stands: setting up while its first read
 * is on its way; "Try again" once that read failed; otherwise the line that GitRanks does not read the account.
 */
export function ContributeNoProfileOf({
  state,
  product = 'Contribute',
}: {
  state: ContributeSetupState;
  product?: SetupProduct;
}) {
  if (state === 'setting-up') return <ContributeSettingUp product={product} />;
  if (state === 'failed') return <ContributeSetupFailed product={product} />;
  return <ContributeNoProfile product={product} />;
}
