import 'server-only';

import { loadAttempts } from './contribute.data';
import type { WorkspaceGate } from './gate';
import { loadWorkspaceGate } from './gate.data';
import { type ContributeFlowStep, contributeFlowPlaceOf, type FlowPlace, hasAnyAttempt } from './getting-in';
import { contributeOpen } from './preview-gate';

/**
 * Where the viewer belongs on Contribute's step `step` (`contributeFlowPlaceOf`), with the gate it was decided by.
 * Whether Contribute is launched is asked only when it decides something; any attempt is read only for an account that
 * has entered.
 */
export async function loadContributeFlowPlace(
  step: ContributeFlowStep,
): Promise<{ place: FlowPlace; gate: WorkspaceGate }> {
  const gate = await loadWorkspaceGate();
  const [launched, hasAttempt] = await Promise.all([
    gate.kind === 'signed-out' || gate.kind === 'hidden' ? contributeOpen() : true,
    gate.kind === 'open' && gate.entered ? loadAttempts(undefined, 1).then(hasAnyAttempt) : false,
  ]);
  return { place: contributeFlowPlaceOf(step, { gate, launched, hasAttempt }), gate };
}
