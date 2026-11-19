import { WorkspaceTabsNav } from '@/components/workspace/workspace-tabs-nav';
import { loadContributeActivity, loadContributeVersion, loadNeedsYouCount } from '@/lib/workspace/contribute.data';
import { tabsOf } from '@/lib/workspace/gate';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';

/**
 * The workspace's tabs for the viewer, as the gate gives them (none before they have entered, Learn only where it is
 * open to them), with what the API is working on for them, the count of what needs them, and the version the poll
 * starts from (read first, inside the gate's read of the user). The reads are the page's own (once per request). An
 * outage leaves no tabs; the page says to try again.
 */
export async function WorkspaceTabs() {
  const gate = await loadWorkspaceGate().catch(() => null);
  const tabs = gate ? tabsOf(gate) : [];
  if (!tabs.length) return <WorkspaceTabsNav tabs={tabs} />;
  const [version, activity, needsYou] = await Promise.all([
    loadContributeVersion().catch(() => null),
    loadContributeActivity().catch(() => null),
    loadNeedsYouCount().catch(() => null),
  ]);
  return <WorkspaceTabsNav tabs={tabs} activity={activity} version={version} needsYou={needsYou} />;
}
