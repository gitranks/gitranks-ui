import type { Route } from 'next';

import type { ContributeAttempt, ContributeView } from './contribute.types';
import { connectedKeyOf, isMidSetup } from './contribute-state';
import { withFlowWayBack } from './flow-way-back';
import { hasContributeSign, type WorkspaceGate } from './gate';
import { GETTING_IN_PATHS, WORKSPACE_PATHS } from './paths';
import { learnStartConnectionOf } from './start/start-page';

/**
 * Who belongs where on the way in: the step a landing's button resumes at, and what a step's page does for the person
 * who opens it. Two facts decide most of it: the Contribute sign (the person went through this onboarding before), and
 * whether an agent of theirs is connected.
 */

/** The flow, by side: Contribute's (Learn's own flow became Set up Learn). */
export type FlowSide = 'contribute';

/**
 * Contribute's steps: who does the work (`agent`, at `/contribute/start` and `/contribute/start/agent`), with its two
 * ways (your own agent, a Claude key), then your first issue.
 */
export type ContributeFlowStep = 'agent' | 'agent-own' | 'agent-key' | 'issue';

/** What a step's page does: draw the step; the setting-up panel; the no-profile panel; a 404; or a redirect. */
export type FlowPlace =
  | { kind: 'page' }
  | { kind: 'setting-up' }
  | { kind: 'no-profile' }
  | { kind: 'not-found' }
  | { kind: 'redirect'; to: Route };

const PAGE: FlowPlace = { kind: 'page' };
const redirectTo = (to: Route): FlowPlace => ({ kind: 'redirect', to });

/**
 * The places every step shares before the step itself counts: an account being set up waits in the frame (the address
 * kept); one the workspace is not open to sees the no-profile panel once Contribute is launched, else a 404. Null for a
 * visitor and for an open account.
 */
function sharedPlaceOf(gate: WorkspaceGate, launched: boolean): FlowPlace | null {
  if (gate.kind === 'setting-up') return { kind: 'setting-up' };
  if (gate.kind === 'hidden') return launched ? { kind: 'no-profile' } : { kind: 'not-found' };
  return null;
}

/** What is connected, by the one meaning every page and the sign's route share: a used own agent, a working key. */
export type FlowConnected = { own: boolean; hosted: boolean };

/**
 * What is connected for the flow: an own agent whose connection has been used (a signed-in agent, or a token with a
 * last call), and a Claude key that is saved and not refused. An unused token is not connected.
 */
export const flowConnectedOf = (view: ContributeView | null | undefined): FlowConnected => ({
  own: !!learnStartConnectionOf(view?.ownAgent?.tokens),
  hosted: !!connectedKeyOf(view),
});

/**
 * The facts a Contribute step is decided by. `hasAttempt` is read only for a person with the Contribute sign;
 * `connected` by `flowConnectedOf`; `query` is the step's own (`?from=agent`), kept where the step sends someone on to
 * the same thing elsewhere; `issue` is the way back (`?issue=`), kept by every move inside the flow.
 */
export type ContributeFlowFacts = {
  gate: WorkspaceGate;
  launched: boolean;
  hasAttempt: boolean;
  connected: FlowConnected;
  query?: string;
  issue?: string | null;
};

/** What Contribute's step `step` does for the person who opens it. */
export function contributeFlowPlaceOf(
  step: ContributeFlowStep,
  { gate, launched, hasAttempt, connected, query = '', issue = null }: ContributeFlowFacts,
): FlowPlace {
  const back = (to: Route) => withFlowWayBack(to, issue);
  const start = back(GETTING_IN_PATHS.contributeStart);
  if (gate.kind === 'signed-out') {
    if (!launched) return { kind: 'not-found' };
    // A visitor's buttons on the first step sign in and go on: every later step sends a visitor there.
    return step === 'agent' ? PAGE : redirectTo(start);
  }
  const shared = sharedPlaceOf(gate, launched);
  if (shared) return shared;
  if (gate.kind !== 'open') return { kind: 'not-found' };
  const anyConnected = connected.own || connected.hosted;
  if (!hasContributeSign(gate)) {
    // The second step is where the sign is set, which needs something connected.
    if (step === 'issue') return anyConnected ? PAGE : redirectTo(start);
    return PAGE;
  }
  // With the sign: the first step opens, so a person can come back to add the other way. An agent's link to connect it
  // (`?start=agent`) still leads to connecting one, on the Agent tab's page. The first issue is still to pick until any
  // attempt exists.
  if (step === 'agent') return PAGE;
  if (step === 'agent-own') {
    return redirectTo((query ? `${WORKSPACE_PATHS.agentConnect}?${query}` : WORKSPACE_PATHS.agentConnect) as Route);
  }
  if (hasAttempt) return redirectTo(WORKSPACE_PATHS.contribute);
  if (step === 'agent-key') return redirectTo(back(GETTING_IN_PATHS.contributeIssue));
  return anyConnected ? PAGE : redirectTo(WORKSPACE_PATHS.agent);
}

/**
 * Where a landing's one button leads: into its flow at `href` (the server's step, swapped in the browser for the step
 * this browser was last on when that is where the person resumes), or, for a member reading how it works, back to the
 * side itself.
 */
export type LandingStart = { href: Route; signedIn: boolean } | { member: true };

/**
 * Where Contribute's landing button resumes a signed-in person without the sign: their agent's connect step while a
 * token of theirs waits for its first call, else the first step. (The browser adds its bookmark's way back.)
 */
export function contributeResumeOf(view: ContributeView | null | undefined): Route {
  if (isMidSetup(view)) return GETTING_IN_PATHS.contributeAgentOwn;
  return GETTING_IN_PATHS.contributeStart;
}

/**
 * Whether the account has any attempt, of either mode (a fix or a lesson), in any state: the read of one attempt
 * (`loadAttempts(undefined, 1)`). A failed read counts as one, so nobody is held on Your first issue by an outage.
 */
export const hasAnyAttempt = (attempts: readonly ContributeAttempt[] | undefined): boolean =>
  attempts === undefined || attempts.length > 0;
