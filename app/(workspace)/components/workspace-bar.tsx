import { cookies } from 'next/headers';

import { BarSwitch } from './bar-switch';
import { LearnBarLive } from '@/components/learn/bar/learn-bar-live';
import { WorkspaceTabs } from '@/components/workspace/workspace-tabs';
import { FROM_LEARN } from '@/lib/learn/paths';
import { audienceOf } from '@/lib/workspace/audience';
import { loadContribute } from '@/lib/workspace/contribute.data';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { LAST_BAR_COOKIE, lastBarOf } from '@/lib/workspace/settings-bar';

/**
 * The bar under the header on the workspace's pages: the workspace's tabs, or on Settings Learn's bar, with Settings
 * as its current tab, where Learn opened the page (page 23, `BarSwitch`). Learn's bar is offered only where Learn is
 * open to the person; the reads are the tabs' own, once per request.
 */
export async function WorkspaceBar() {
  const [gate, jar] = await Promise.all([loadWorkspaceGate().catch(() => null), cookies()]);
  const learnOpen = gate?.kind === 'open' && gate.learnOpen;
  const view = learnOpen ? await loadContribute().catch(() => null) : null;
  return (
    <BarSwitch
      learnOpen={learnOpen}
      audience={audienceOf(view?.sides, learnOpen)}
      lastBar={lastBarOf(jar.get(LAST_BAR_COOKIE)?.value)}
      learn={<LearnBarLive from={FROM_LEARN} />}
    >
      <WorkspaceTabs />
    </BarSwitch>
  );
}
