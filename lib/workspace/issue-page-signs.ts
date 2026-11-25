import type { Route } from 'next';

import { withFlowWayBack } from './flow-way-back';
import type { WorkspaceSigns } from './gate';
import { type IssuePageFrom, issuePageHrefOf } from './masked-issue';
import { GETTING_IN_PATHS, learnSetupHrefOf } from './paths';

/*
 * The page of one issue by the signs: reading it is open to any signed-in person, and only starting a fix needs the
 * onboarding of the product it is made with. A sign that is not known (null) keeps today's page: nothing sends a person
 * to an onboarding on a sign that could not be read.
 */

/**
 * Which product the page is opened from: `from=learn` is Learn and `from=contribute` is Contribute. Any other value
 * (an email's, an agent's, none) names no product, and then the signs decide: the Learn sign without the Contribute
 * sign is Learn, anything else Contribute.
 */
export function issuePageProductOf(from: unknown, signs: WorkspaceSigns): IssuePageFrom {
  if (from === 'learn' || from === 'contribute') return from;
  return signs.learn === true && signs.contribute !== true ? 'learn' : 'contribute';
}

/** The onboarding the start part asks for before a fix: Contribute's or Learn's. */
export type IssueSetup = IssuePageFrom;

/** The onboarding the page's product needs first; null when its sign is there or not known. */
export function issueSetupOf(from: IssuePageFrom, signs: WorkspaceSigns): IssueSetup | null {
  if (from === 'learn') return signs.learn === false ? 'learn' : null;
  return signs.contribute === false ? 'contribute' : null;
}

/**
 * What the start part offers by the signs.
 * - `justFix`: "Just fix it" from Learn is a fix made with Contribute, which the server refuses without the Contribute
 *   sign, so it is offered only with it (or while that sign is not known, as before the signs).
 * - `walkthrough`: the line that adds the walkthrough to a fix from Contribute starts a fix made with Learn, so it reads
 *   the Learn sign; while that is not known, today's rule (`usesLearn`: a saved setup of Learn or the Learn side).
 */
export function issueStartSignsOf(
  signs: WorkspaceSigns,
  usesLearn: boolean,
): { justFix: boolean; walkthrough: boolean } {
  return { justFix: signs.contribute !== false, walkthrough: signs.learn ?? usesLearn };
}

/**
 * Where "Start fixing it" leads without the sign: Contribute's onboarding with the way back to this issue
 * (`/contribute/start?issue=<id>`), or Learn's with the way back to this page as Learn opened it, the view kept.
 */
export function issueSetupHrefOf(setup: IssueSetup, id: string, view?: string | null): Route {
  if (setup === 'contribute') return withFlowWayBack(GETTING_IN_PATHS.contributeStart, id);
  return learnSetupHrefOf(issuePageHrefOf(id, 'learn', false, view));
}

/** The line under "Start fixing it" without the sign. */
export const ISSUE_SETUP_LINES: Record<IssueSetup, string> = {
  contribute: 'First time here? A 2-minute setup shows how Contribute works, then you come back to this issue.',
  learn: 'First time here? A 2-minute setup shows how Learn works, then you come back to this issue.',
};
