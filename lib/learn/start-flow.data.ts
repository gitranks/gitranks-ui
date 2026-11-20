import 'server-only';

import { cacheLife } from 'next/cache';

import { loadLearnProfile } from './learn.data';
import { LearnPublicIssuesDocument, LearnPublicPracticeDocument } from './learn.documents';
import type { LearnProfile, LearnPublicIssues, PracticeLessons } from './learn.types';
import { learnOpenToEveryone } from './learn-everyone';
import { hasGoal } from './learn-home';
import type { LearnGoalLanguage } from './start-flow';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import type { WorkspaceGate } from '@/lib/workspace/gate';
import { loadWorkspaceGate } from '@/lib/workspace/gate.data';
import { type FlowPlace, type LearnFlowStep, learnFlowPlaceOf } from '@/lib/workspace/getting-in';
import type { IssueRef } from '@/lib/workspace/paths';
import { contributeOpen } from '@/lib/workspace/preview-gate';

/**
 * Where the viewer belongs on Learn's step `step` (`learnFlowPlaceOf`), with the gate it was decided by and the
 * viewer's saved goal (null when none is read: a visitor, or an account Learn is not open to). Whether Contribute is
 * launched is asked only for an account with no profile; whether Learn is open to everyone only for a visitor.
 */
export async function loadLearnFlowPlace(
  step: LearnFlowStep,
  { goalInAddress, issue }: { goalInAddress: boolean; issue?: Pick<IssueRef, 'repo' | 'issue'> },
): Promise<{ place: FlowPlace; gate: WorkspaceGate; profile: LearnProfile | null }> {
  const gate = await loadWorkspaceGate();
  const [launched, openToEveryone, profile] = await Promise.all([
    gate.kind === 'hidden' ? contributeOpen() : true,
    gate.kind === 'signed-out' ? learnOpenToEveryone() : false,
    gate.kind === 'open' && gate.learnOpen ? loadLearnProfile() : null,
  ]);
  const place = learnFlowPlaceOf(step, {
    gate,
    launched,
    openToEveryone,
    goalSaved: hasGoal(profile),
    goalInAddress,
    issue,
  });
  return { place, gate, profile };
}

/** A read made for everyone: the API's answer (null: none for this language now), or `ok: false` when it failed. */
export type PublicRead<T> = { ok: true; data: T | null } | { ok: false };

/** The most public practice lessons kept per language; Show 3 more reveals them in place. */
export const LEARN_PUBLIC_PRACTICE_MAX = 30;

/**
 * A language's day list for visitors (a short list, the same for every visitor that day): one kept answer per
 * language, for minutes; a failed read is kept for seconds only, so the next visitor asks again.
 */
export async function readLearnPublicIssues(language: LearnGoalLanguage): Promise<PublicRead<LearnPublicIssues>> {
  'use cache';
  try {
    const { learnPublicIssues } = await graphqlDirect(LearnPublicIssuesDocument, { language }, { source: 'ssr' });
    cacheLife('minutes');
    return { ok: true, data: learnPublicIssues };
  } catch {
    cacheLife('seconds');
    return { ok: false };
  }
}

/**
 * Public practice lessons for a language, for visitors: the first 30 in one kept answer per language, for minutes (the
 * page shows 3 of them, then 3 more a time); a failed read is kept for seconds only.
 */
export async function readLearnPublicPractice(language: LearnGoalLanguage): Promise<PublicRead<PracticeLessons>> {
  'use cache';
  try {
    const { learnPublicPractice } = await graphqlDirect(
      LearnPublicPracticeDocument,
      { language, first: LEARN_PUBLIC_PRACTICE_MAX },
      { source: 'ssr' },
    );
    cacheLife('minutes');
    return { ok: true, data: learnPublicPractice };
  } catch {
    cacheLife('seconds');
    return { ok: false };
  }
}
