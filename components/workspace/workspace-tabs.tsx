import { cookies } from 'next/headers';
import type { ReactNode } from 'react';

import { LearnDoor } from '@/components/workspace/learn-door';
import { type LearnBarChoice, WorkspaceTabsNav } from '@/components/workspace/workspace-tabs-nav';
import { audienceOf } from '@/lib/workspace/audience';
import {
  loadContribute,
  loadContributeActivity,
  loadContributeVersion,
  loadNeedsYouCount,
} from '@/lib/workspace/contribute.data';
import { pollsOf, tabsOf } from '@/lib/workspace/gate';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { LAST_BAR_COOKIE, lastBarOf } from '@/lib/workspace/settings-bar';

/**
 * The workspace's tabs for the viewer, as the gate gives them (none without the Contribute sign), and the one poll for
 * either sign, with what the API is working on for them, the count of what needs them, and the version the poll starts
 * from (read first, inside the gate's read of the user). A person with the Learn sign only gets the poll alone. The
 * reads are the page's own (once per request). An outage leaves no tabs and no poll; the page says to try again.
 * `learnBar` is Learn's bar, offered on Settings to an account the workspace is open to, with the bar they saw last and
 * the product they use. `learnDoorCount` is the door's count of lessons due, read in the browser: the door into Learn
 * is drawn with it, after the gate, only for a person who uses Learn and has the tabs.
 */
export async function WorkspaceTabs({
  learnBar,
  learnDoorCount,
}: {
  learnBar?: ReactNode;
  learnDoorCount?: ReactNode;
} = {}) {
  const gate = await loadWorkspaceGate().catch(() => null);
  const tabs = gate ? tabsOf(gate) : [];
  const learn = learnBar && gate?.kind === 'open' ? learnChoiceOf(learnBar) : undefined;
  if (!pollsOf(gate)) return <WorkspaceTabsNav tabs={tabs} learn={await learn} />;
  const [version, activity, needsYou, choice, view] = await Promise.all([
    loadContributeVersion().catch(() => null),
    loadContributeActivity().catch(() => null),
    loadNeedsYouCount().catch(() => null),
    learn,
    loadContribute().catch(() => null),
  ]);
  const door = tabs.length && view?.sides?.learn ? <LearnDoor count={learnDoorCount} /> : undefined;
  return (
    <WorkspaceTabsNav
      tabs={tabs}
      poll
      activity={activity}
      version={version}
      needsYou={needsYou}
      learn={choice}
      door={door}
    />
  );
}

async function learnChoiceOf(bar: ReactNode): Promise<LearnBarChoice> {
  const [jar, view] = await Promise.all([cookies(), loadContribute().catch(() => null)]);
  return { bar, audience: audienceOf(view?.sides), lastBar: lastBarOf(jar.get(LAST_BAR_COOKIE)?.value) };
}
