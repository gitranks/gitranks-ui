import { cookies } from 'next/headers';

import { Header } from '@/components/header/header';
import { OriginHeaderPick } from '@/components/workspace/origin-header-pick';
import { audienceOf } from '@/lib/workspace/audience';
import { loadContribute } from '@/lib/workspace/contribute.data';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { LAST_BAR_COOKIE, lastBarOf } from '@/lib/workspace/settings-bar';

/**
 * The site header of the product the person came from, on a page both products open: the two headers, and what picks
 * one (`settingsBarOf`, as Settings picks its bar): the link's `?from=learn`, else the bar seen last, else the product
 * they use. Contribute's wherever Learn is not open to them, and on any failed read.
 */
export async function OriginHeader() {
  const [gate, jar] = await Promise.all([loadWorkspaceGate().catch(() => null), cookies()]);
  const learnOpen = gate?.kind === 'open' && gate.learnOpen;
  const view = learnOpen ? await loadContribute().catch(() => null) : null;
  return (
    <OriginHeaderPick
      learnOpen={learnOpen}
      audience={audienceOf(view?.sides, learnOpen)}
      lastBar={lastBarOf(jar.get(LAST_BAR_COOKIE)?.value)}
      learn={<Header section="learn" />}
      contribute={<Header section="contribute" />}
    />
  );
}
