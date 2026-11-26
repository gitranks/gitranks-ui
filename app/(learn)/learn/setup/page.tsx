import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';

import { SetupLive } from '@/components/learn/setup/setup-live';
import { OnboardingNoProfile } from '@/components/learn/setup/setup-no-profile';
import { loadLearnSign } from '@/lib/learn/learn-sign.data';
import { learnSetupPageOf } from '@/lib/learn/onboarding';
import { LEARN_SETUP_METADATA } from '@/lib/learn/seo/setup';
import { loadLearnSetup } from '@/lib/learn/setup.data';
import { loadContributeSetupState, viewerLogin } from '@/lib/workspace/contribute.data';
import { isManagedLogin } from '@/lib/workspace/managed-account';
import { learnBackOf } from '@/lib/workspace/paths';

/**
 * Learn's setup page: the onboarding for a person without the Learn sign, the editor of their languages and level for
 * one with it. Only the person's own, so it is never indexed or kept, and drawn for each request: the Learn sign is
 * read here, on the server, so the page never draws one view and then another. With the sign and a way back (`back`,
 * only an address `learnBackOf` takes), the person goes straight there. When the sign cannot be read, the saved setup
 * decides (one that cannot be read either counts as saved), and nobody is sent back. An account GitRanks has no profile
 * of yet has neither: the page shows where its setup stands (`OnboardingNoProfile`), and a company-managed account why
 * it can't be used, before any read. A visitor reads nothing here and
 * gets the sign-in card from the first paint.
 */
export const instant = false;

export const metadata: Metadata = LEARN_SETUP_METADATA;

export default async function SetupPage({ searchParams }: PageProps<'/learn/setup'>) {
  await connection();
  const { back: given } = await searchParams;
  const back = learnBackOf(Array.isArray(given) ? given[0] : given);
  const login = await viewerLogin();
  if (login && isManagedLogin(login)) return <OnboardingNoProfile state="managed" />;
  const sign = login ? await loadLearnSign(login) : null;
  // The setup is read only when the sign cannot be: as before the sign, a saved setup gets the editor, and so does one
  // that cannot be read, so the onboarding's defaults never go over a setup that may be saved. Beside it, where the
  // account's setup stands: an account with no profile yet has neither, and reading it starts the account's first read.
  const [setup, setupState] =
    login && sign === null
      ? await Promise.all([loadLearnSetup(login), loadContributeSetupState()])
      : ([undefined, 'none'] as const);
  if (setup === null && setupState !== 'none') return <OnboardingNoProfile state={setupState} />;
  const saved = setup === null || setup?.state === 'SAVED';
  const page = learnSetupPageOf({ signedIn: login !== null, sign, back, saved });
  if (page.kind === 'redirect') redirect(page.to);
  return <SetupLive mode={page.kind} back={page.back} sign={sign} />;
}
