import type { Route } from 'next';

import type { ContributeAttempt, ContributeView } from './contribute.types';
import { isMidSetup } from './contribute-state';
import type { WorkspaceGate } from './gate';
import { GETTING_IN_PATHS, type IssueRef, startPath, WORKSPACE_PATHS } from './paths';

/**
 * Who belongs where on the way in (getting in, §4 and §5.3): the step a landing's button resumes at, and what a step's
 * page does for the person who opens it. One fact decides most of it: `entered`, once an agent of theirs has connected.
 */

/** The two flows, by side. */
export type FlowSide = 'contribute' | 'learn';

/** Contribute's steps: What you work on, Your agent (the choice, your own agent, a Claude key), Your first issue. */
export type ContributeFlowStep = 'work' | 'agent' | 'agent-own' | 'agent-key' | 'issue';

/** Learn's steps: Your goal, Pick an issue, Your agent (at the picked issue's own start address). */
export type LearnFlowStep = 'goal' | 'issues' | 'issue';

/**
 * What a step's page does: draw the step; draw the frame's sign-in card (back to the same address); the setting-up
 * panel; the no-profile panel; a 404; a redirect; or `apply-then`: draw the step, save the address's answer once from
 * the browser, then move on to `to` (a page load never writes).
 */
export type FlowPlace =
  | { kind: 'page' }
  | { kind: 'sign-in' }
  | { kind: 'setting-up' }
  | { kind: 'no-profile' }
  | { kind: 'not-found' }
  | { kind: 'redirect'; to: Route }
  | { kind: 'apply-then'; to: Route };

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

/**
 * The facts a Contribute step is decided by. `hasAttempt` is read only for an account that has entered; `query` is the
 * step's own (`?from=agent`), kept where the step sends someone on to the same thing elsewhere.
 */
export type ContributeFlowFacts = { gate: WorkspaceGate; launched: boolean; hasAttempt: boolean; query?: string };

/** Contribute's steps that need an account: a visitor meets the sign-in card there. */
const ACCOUNT_STEPS: readonly ContributeFlowStep[] = ['agent-own', 'agent-key', 'issue'];

/** What Contribute's step `step` does for the person who opens it (§5.3). */
export function contributeFlowPlaceOf(
  step: ContributeFlowStep,
  { gate, launched, hasAttempt, query = '' }: ContributeFlowFacts,
): FlowPlace {
  if (gate.kind === 'signed-out') {
    if (!launched) return { kind: 'not-found' };
    return ACCOUNT_STEPS.includes(step) ? { kind: 'sign-in' } : PAGE;
  }
  const shared = sharedPlaceOf(gate, launched);
  if (shared) return shared;
  if (gate.kind !== 'open') return { kind: 'not-found' };
  if (!gate.entered) return step === 'issue' ? redirectTo(GETTING_IN_PATHS.contributeAgent) : PAGE;
  // Entered: the flow is behind them. An agent's link to connect it (`?start=agent`) still leads to connecting one,
  // on the Agent tab's page. The first issue is still to pick until any attempt exists.
  if (step === 'agent-own') {
    return redirectTo((query ? `${WORKSPACE_PATHS.agentConnect}?${query}` : WORKSPACE_PATHS.agentConnect) as Route);
  }
  if (hasAttempt) return redirectTo(WORKSPACE_PATHS.contribute);
  if (step !== 'issue') return redirectTo(GETTING_IN_PATHS.contributeIssue);
  return gate.agents.hosted || gate.agents.own ? PAGE : redirectTo(WORKSPACE_PATHS.agent);
}

/**
 * The facts a Learn step is decided by: the gate, whether Contribute is launched, whether the account has a goal saved,
 * whether the address carries one, and the issue step 3 is at.
 */
export type LearnFlowFacts = {
  gate: WorkspaceGate;
  launched: boolean;
  goalSaved: boolean;
  goalInAddress: boolean;
  issue?: Pick<IssueRef, 'repo' | 'issue'>;
};

/** What Learn's step `step` does for the person who opens it (§5.3, §6.2). */
export function learnFlowPlaceOf(
  step: LearnFlowStep,
  { gate, launched, goalSaved, goalInAddress, issue }: LearnFlowFacts,
): FlowPlace {
  if (gate.kind === 'signed-out') {
    // A visitor's goal lives in the address alone: Pick an issue without one asks it first.
    return step === 'issues' && !goalInAddress ? redirectTo(GETTING_IN_PATHS.learnGoal) : PAGE;
  }
  const shared = sharedPlaceOf(gate, launched);
  if (shared) return shared;
  if (gate.kind !== 'open') return { kind: 'not-found' };
  if (!gate.entered) {
    // Pick an issue and Your agent need a goal: saved, or in the address to save first; Your goal asks it otherwise.
    return step !== 'goal' && !goalSaved && !goalInAddress ? redirectTo(GETTING_IN_PATHS.learnGoal) : PAGE;
  }
  // Entered: on to the Learn tab, or the issue's Start page in lesson mode; a goal the address carries and the account
  // lacks is saved first.
  if (step === 'goal') return redirectTo(WORKSPACE_PATHS.learn);
  const to = step === 'issue' && issue ? startPath(issue, { lesson: true }) : WORKSPACE_PATHS.learn;
  return goalInAddress && !goalSaved ? { kind: 'apply-then', to } : redirectTo(to);
}

/**
 * Where a landing's one button leads: into its flow at `href` (the server's step, swapped in the browser for the step
 * this browser was last on when that is where the person resumes), or, for a member reading how it works, back to the
 * side itself.
 */
export type LandingStart = { href: Route; signedIn: boolean } | { member: true };

/**
 * Where Contribute's landing button resumes a signed-in person who has not entered (§4.1): their agent's connect step
 * while a token of theirs waits for its first call, step 2 once preferences are saved, else step 1.
 */
export function contributeResumeOf(view: ContributeView | null | undefined): Route {
  if (isMidSetup(view)) return GETTING_IN_PATHS.contributeAgentOwn;
  if (view?.contributor?.preferences) return GETTING_IN_PATHS.contributeAgent;
  return GETTING_IN_PATHS.contributeWork;
}

/** Where Learn's landing button resumes a signed-in person (§4.1): step 2 once a goal is saved, else step 1. */
export const learnResumeOf = (goalSaved: boolean): Route =>
  goalSaved ? GETTING_IN_PATHS.learnIssues : GETTING_IN_PATHS.learnGoal;

/**
 * Whether the account has any attempt, of either mode (a fix or a lesson), in any state: the read of one attempt
 * (`loadAttempts(undefined, 1)`). A failed read counts as one, so nobody is held on Your first issue by an outage.
 */
export const hasAnyAttempt = (attempts: readonly ContributeAttempt[] | undefined): boolean =>
  attempts === undefined || attempts.length > 0;
