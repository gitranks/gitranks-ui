import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import { type LearnBarChoice, WorkspaceTabsNav } from '@/components/workspace/workspace-tabs-nav';
import { audienceOf } from '@/lib/workspace/audience';
import {
  loadContribute,
  loadContributeActivity,
  loadContributeVersion,
  loadNeedsYouCount,
} from '@/lib/workspace/contribute.data';
import { tabsOf } from '@/lib/workspace/gate';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { LAST_BAR_COOKIE, lastBarOf } from '@/lib/workspace/settings-bar';

/**
 * The workspace's tabs for the viewer, as the gate gives them (none before they have entered, Learn only where it is
 * open to them), with what the API is working on for them, the count of what needs them, and the version the poll
 * starts from (read first, inside the gate's read of the user). The reads are the page's own (once per request). An
 * outage leaves no tabs; the page says to try again. `learnBar` is Learn's bar, offered on Settings where Learn is
 * open to the person, with the bar they saw last and the product they use.
 */
export async function WorkspaceTabs({ learnBar }: { learnBar?: ReactNode } = {}) {
  const gate = await loadWorkspaceGate().catch(() => null);
  const tabs = gate ? tabsOf(gate) : [];
  const learnOpen = gate?.kind === 'open' && gate.learnOpen;
  const learn = learnBar && learnOpen ? learnChoiceOf(learnBar) : undefined;
  if (!tabs.length) return <WorkspaceTabsNav tabs={tabs} learn={await learn} />;
  const [version, activity, needsYou, choice] = await Promise.all([
    loadContributeVersion().catch(() => null),
    loadContributeActivity().catch(() => null),
    loadNeedsYouCount().catch(() => null),
    learn,
  ]);
  return <WorkspaceTabsNav tabs={tabs} activity={activity} version={version} needsYou={needsYou} learn={choice} />;
}

async function learnChoiceOf(bar: ReactNode): Promise<LearnBarChoice> {
  const [jar, view] = await Promise.all([cookies(), loadContribute().catch(() => null)]);
  return { bar, audience: audienceOf(view?.sides, true), lastBar: lastBarOf(jar.get(LAST_BAR_COOKIE)?.value) };
}
