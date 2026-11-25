import type { Route } from 'next';

import { LandingDefaults } from './landing-parts/defaults';
import { LandingFoot } from './landing-parts/foot';
import { LandingHead } from './landing-parts/head';
import { LandingPrFooter } from './landing-parts/pr-footer';
import { LandingProofRows } from './landing-parts/proof-rows';
import { LandingQuestions } from './landing-parts/questions';
import { LandingSteps } from './landing-parts/steps';
import { LandingWays } from './landing-parts/ways';
import { ComingSoon } from '@/components/workspace/agent/coming-soon';
import { LandingBand } from '@/components/workspace/getting-in/landing-band';
import type { AgentPageStats } from '@/lib/contribute/agent-page.types';
import { LANDING_BAND_TEXT } from '@/lib/contribute/landing-copy';
import type { LandingProof } from '@/lib/contribute/landing-proof';
import type { ContributeComingSoonProvider } from '@/lib/workspace/contribute.types';
import type { LandingViewer } from '@/lib/workspace/contribute-state';
import type { LandingStart } from '@/lib/workspace/getting-in';
import { MAINTAINERS_PATH } from '@/lib/workspace/paths';

/**
 * Contribute's landing, top to bottom: the head with one real pull request beside it, the two ways, what is coming, the
 * four steps, the newest pull requests merged through GitRanks, the defaults, what it promises maintainers, the
 * questions, the foot. One button, Start contributing, into the flow (for a member reading how it works, Go to your
 * issues). `preview`: a signed-in user seeing the visitor's page (`?as=visitor`). `noted`: the coming-soon providers
 * the user asked to be told about. `proof`: what the newest pull requests give (`landingProofOf`); a part with nothing
 * is left out. `ledgerOpen`: whether "Merged through GitRanks" links the public ledger.
 */
export function Landing({
  viewer,
  start,
  preview = false,
  noted,
  stats = null,
  proof = { card: null, rows: null },
  ledgerOpen = false,
}: {
  viewer: LandingViewer;
  start: LandingStart;
  preview?: boolean;
  noted?: readonly ContributeComingSoonProvider[];
  /** The pool's public numbers, a line under the head's button; left out when unread or when nothing is ready. */
  stats?: AgentPageStats | null;
  proof?: LandingProof;
  ledgerOpen?: boolean;
}) {
  return (
    <main className="flex flex-col" data-landing-viewer={viewer}>
      <LandingHead start={start} stats={stats} card={proof.card} />
      <LandingWays />
      <ComingSoon viewer={viewer} preview={preview} noted={noted} />
      <LandingSteps />
      {proof.rows ? <LandingProofRows rows={proof.rows} ledgerOpen={ledgerOpen} /> : null}
      <LandingDefaults />
      <LandingBand text={LANDING_BAND_TEXT} href={MAINTAINERS_PATH as Route} footer={<LandingPrFooter />} muted />
      <LandingQuestions />
      <LandingFoot start={start} />
    </main>
  );
}
