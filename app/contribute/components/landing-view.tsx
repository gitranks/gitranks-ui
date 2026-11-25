import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';

import { Landing } from './landing';
import { ContributeNoProfileOf, ContributeSettingUp } from '@/components/workspace/setting-up';
import { loadAgentPage } from '@/lib/contribute/agent-page';
import type { AgentPageStats } from '@/lib/contribute/agent-page.types';
import { type LandingProof, landingProofOf } from '@/lib/contribute/landing-proof';
import { loadLandingLedgerOpen, loadLandingProof } from '@/lib/contribute/landing-proof.data';
import {
  loadContribute,
  loadContributeSetupState,
  loadProviderInterests,
  viewerLogin,
} from '@/lib/workspace/contribute.data';
import type { ContributeView } from '@/lib/workspace/contribute.types';
import { hasContributeSignIn } from '@/lib/workspace/contribute-state';
import { contributeResumeOf, type LandingStart } from '@/lib/workspace/getting-in';
import { GETTING_IN_PATHS } from '@/lib/workspace/paths';
import { contributeOpen } from '@/lib/workspace/preview-gate';

/** A visitor's way in, the same for every visitor: the flow's first step (a bookmark may resume them further on). */
export const VISITOR_START: LandingStart = { href: GETTING_IN_PATHS.contributeStart, signedIn: false };

/**
 * Where the landing's one button leads a signed-in person: the step of the flow that is left for them, or, with the
 * Contribute sign, Contribute home ("Go to your issues").
 */
export const signedInStartOf = (view: ContributeView): LandingStart =>
  hasContributeSignIn(view) ? { member: true } : { href: contributeResumeOf(view), signedIn: true };

/** What the landing draws from live reads: the numbers line, the proof, and whether the public ledger is open. */
export type LandingLive = { stats: AgentPageStats | null; proof: LandingProof; ledgerOpen: boolean };

/**
 * The landing's live reads, started beside the view's read so neither waits for the other: the numbers line and the
 * newest pull requests with a public page, and whether the public ledger is open. Each settles to null (closed, for
 * the ledger) on a failure, the proof and the ledger also past their time limit, and is read once per request.
 */
export function startLandingReads() {
  return { agentPage: loadAgentPage(), proof: loadLandingProof(), ledgerOpen: loadLandingLedgerOpen() };
}

/** The live reads as the landing draws them, awaited before it draws (the head's layout differs without the card). */
export async function landingLiveOf(reads: ReturnType<typeof startLandingReads>): Promise<LandingLive> {
  const [agentPage, prs, ledgerOpen] = await Promise.all([reads.agentPage, reads.proof, reads.ledgerOpen]);
  return { stats: agentPage?.stats ?? null, proof: landingProofOf(prs), ledgerOpen };
}

/** A panel of Contribute's home, in the page's column. */
const panel = (children: ReactNode) => <main className="mx-auto w-full max-w-7xl px-4 pt-10 pb-16">{children}</main>;

/**
 * What a landing page shows when the request has no Contribute view: a new account being set up gets the panel that
 * says so (it reads itself again until ready); a signed-in account with no profile, once Contribute is launched, the
 * panel for where its setup stands (a failed read: "Try again"); a visitor, once launched, nothing here (the page
 * draws the visitor's landing). Before the launch, a 404.
 */
export async function noViewPanelOf(): Promise<ReactNode | null> {
  const setup = await loadContributeSetupState();
  if (setup === 'setting-up') return panel(<ContributeSettingUp />);
  if (!(await contributeOpen(Date.now()))) notFound();
  if (await viewerLogin()) return panel(<ContributeNoProfileOf state={setup} />);
  return null;
}

/**
 * How Contribute works (`/contribute/about`): the landing for anyone, the button to the step that is left, or Go to
 * your issues for a member. A visitor sees it once Contribute is launched; an account being set up or with no profile
 * sees the panel that says so, as on `/contribute`.
 */
export async function ContributeAboutView() {
  const reads = startLandingReads();
  const view = await loadContribute();
  if (!view) {
    return (
      (await noViewPanelOf()) ?? (
        <Landing viewer="visitor" start={VISITOR_START} noted={[]} {...(await landingLiveOf(reads))} />
      )
    );
  }
  const [noted, live] = await Promise.all([loadProviderInterests(), landingLiveOf(reads)]);
  return <Landing viewer="signed-in" start={signedInStartOf(view)} noted={noted} {...live} />;
}
