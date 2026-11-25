import 'server-only';

import { loadAttempts, loadContribute } from './contribute.data';
import { hasContributeSign, type WorkspaceGate } from './gate';
import { loadWorkspaceGate } from './gate.data';
import {
  type ContributeFlowFacts,
  type ContributeFlowStep,
  contributeFlowPlaceOf,
  type FlowPlace,
  flowConnectedOf,
  hasAnyAttempt,
} from './getting-in';
import { loadIssuePage } from './masked-issue.data';
import type { IssuePage } from './masked-issue.types';
import { contributeOpen } from './preview-gate';

/**
 * Where the viewer belongs on Contribute's step `step` (`contributeFlowPlaceOf`), with the gate and the facts it was
 * decided by. Whether Contribute is launched is asked only when it decides something; any attempt is read only for a
 * person with the Contribute sign. `query` is the step's own query, `issue` the way back.
 */
export async function loadContributeFlowPlace(
  step: ContributeFlowStep,
  { query, issue = null }: { query?: string; issue?: string | null } = {},
): Promise<{ place: FlowPlace; gate: WorkspaceGate; facts: ContributeFlowFacts }> {
  const gate = await loadWorkspaceGate();
  const open = gate.kind === 'open';
  const [launched, hasAttempt, view] = await Promise.all([
    gate.kind === 'signed-out' || gate.kind === 'hidden' ? contributeOpen(Date.now()) : true,
    open && hasContributeSign(gate) && step !== 'agent-own' ? loadAttempts(undefined, 1).then(hasAnyAttempt) : false,
    // The gate read it already: the same request's read, shared.
    open ? loadContribute() : null,
  ]);
  const facts: ContributeFlowFacts = { gate, launched, hasAttempt, connected: flowConnectedOf(view), query, issue };
  return { place: contributeFlowPlaceOf(step, facts), gate, facts };
}

/**
 * The issue the flow was opened from (the way back), when it still reads for the viewer: masked, or held in full by
 * them. Null with no way back, for a visitor (the issue's page is not open to one), for an issue taken, given back or
 * started since, and when it cannot be read: the step is then drawn without it, never as an error.
 */
export async function loadOpenedIssue(issue: string | null): Promise<IssuePage | null> {
  if (!issue) return null;
  const load = await loadIssuePage(issue).catch(() => null);
  if (load?.kind !== 'page' || !load.page.masked) return null;
  return load.page.state === 'MASKED' || load.page.state === 'FULL' ? load.page : null;
}
