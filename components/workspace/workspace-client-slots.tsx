import { TimeZoneNote } from '@/components/workspace/time-zone-note';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';

/**
 * The client parts a workspace page view mounts once, under the tabs, for a user the workspace is open to (never a
 * visitor on a landing): the time zone note. Parts that must run on every page of the workspace (and nothing else) are
 * added here, not to a page. The gate is the tabs' own read, once per request.
 */
export async function WorkspaceClientSlots() {
  const gate = await loadWorkspaceGate().catch(() => null);
  return gate?.kind === 'open' ? <TimeZoneNote /> : null;
}
