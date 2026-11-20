import { notFound } from 'next/navigation';

import { Landing, type LandingStart } from './landing';
import { loadAgentPage } from '@/lib/contribute/agent-page';
import { loadContribute, loadProviderInterests } from '@/lib/workspace/contribute.data';
import type { ContributeView } from '@/lib/workspace/contribute.types';
import { isOnboarded } from '@/lib/workspace/contribute-state';
import { contributeResumeOf } from '@/lib/workspace/getting-in';
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

/**
 * How Contribute works (`/contribute/about`): the landing for anyone, the button to the step that is left, or Open
 * Contribute for a member. A visitor sees it once Contribute is launched; an account the API knows no profile of reads
 * it as a visitor does.
 */
export async function ContributeAboutView() {
  const agentPage = loadAgentPage();
  const view = await loadContribute();
  if (!view) {
    if (!(await contributeOpen())) notFound();
    return <Landing viewer="visitor" start={VISITOR_START} noted={[]} stats={(await agentPage)?.stats} />;
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
