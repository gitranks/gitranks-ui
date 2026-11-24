import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { Landing } from './landing';
import { ContributeNoProfile, ContributeSettingUp } from '@/components/workspace/setting-up';
import { loadAgentPage } from '@/lib/contribute/agent-page';
import {
  loadContribute,
  loadContributeSetup,
  loadProviderInterests,
  viewerLogin,
} from '@/lib/workspace/contribute.data';
import type { ContributeView } from '@/lib/workspace/contribute.types';
import { isOnboarded } from '@/lib/workspace/contribute-state';
import { contributeResumeOf, type LandingStart } from '@/lib/workspace/getting-in';
import { GETTING_IN_PATHS } from '@/lib/workspace/paths';
import { contributeOpen } from '@/lib/workspace/preview-gate';

/** A visitor's way in, the same for every visitor: the flow's first step (a bookmark may resume them further on). */
export const VISITOR_START: LandingStart = { href: GETTING_IN_PATHS.contributeWork, signedIn: false };

/**
 * Where the landing's one button leads a signed-in person: the step of the flow that is left for them (§4.1), or, once
 * they have entered, Contribute itself.
 */
export const signedInStartOf = (view: ContributeView): LandingStart =>
  isOnboarded(view) ? { member: true } : { href: contributeResumeOf(view), signedIn: true };

/** A panel of Contribute's home, in the page's column. */
const panel = (children: ReactNode) => <main className="mx-auto w-full max-w-7xl px-4 pt-10 pb-16">{children}</main>;

/**
 * What a landing page shows when the request has no Contribute view: a new account being set up gets the panel that
 * says so (it reads itself again until ready); a signed-in account with no profile, once Contribute is launched, the
 * panel that says that; a visitor, once launched, nothing here (the page draws the visitor's landing). Before the
 * launch, a 404.
 */
export async function noViewPanelOf(): Promise<ReactNode | null> {
  if (await loadContributeSetup()) return panel(<ContributeSettingUp />);
  if (!(await contributeOpen(Date.now()))) notFound();
  if (await viewerLogin()) return panel(<ContributeNoProfile />);
  return null;
}

/**
 * How Contribute works (`/contribute/about`): the landing for anyone, the button to the step that is left, or Open
 * Contribute for a member. A visitor sees it once Contribute is launched; an account being set up or with no profile
 * sees the panel that says so, as on `/contribute`.
 */
export async function ContributeAboutView() {
  const agentPage = loadAgentPage();
  const view = await loadContribute();
  if (!view) {
    return (
      (await noViewPanelOf()) ?? (
        <Landing viewer="visitor" start={VISITOR_START} noted={[]} stats={(await agentPage)?.stats} />
      )
    );
  }
  return (
    <Landing
      viewer="signed-in"
      start={signedInStartOf(view)}
      noted={await loadProviderInterests()}
      stats={(await agentPage)?.stats}
    />
  );
}
