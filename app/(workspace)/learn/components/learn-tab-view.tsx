import { LearnTabScreen } from './learn-tab';
import {
  loadLearnIssues,
  loadLearnProfile,
  loadLearnSetup,
  loadMyLearnAttempts,
  loadPracticeLessons,
} from '@/lib/learn/learn.data';
import { LEARN_ISSUES_FIRST, learnTabStateOf, PRACTICE_FIRST } from '@/lib/learn/learn-tab';
import { loadLearnProgress } from '@/lib/learn/progress/progress.data';
import { rulesBannerOf } from '@/lib/learn/rules-banner';
import { lastUsedTokenOf } from '@/lib/workspace/agent-way';
import { loadContribute, loadContributeActivity, loadFairUseNotices } from '@/lib/workspace/contribute.data';
import { isSuspended } from '@/lib/workspace/contribute-state';
import { loadMaskedListReads } from '@/lib/workspace/masked-issue.data';

/**
 * The Learn tab's reads, by the state: the numbers, the viewer's lessons in progress and the account beside each
 * other; the issues and practice lessons only where the state shows them. A read that fails leaves its part out.
 */
export async function LearnTab() {
  const [settingUp, attempts, progress, view, fairUse] = await Promise.all([
    loadLearnSetup(),
    loadMyLearnAttempts(),
    loadLearnProgress(),
    loadContribute().catch(() => null),
    loadFairUseNotices(),
  ]);
  // A new account's profile cannot be read yet: its setup line stands for everything else.
  const profile = settingUp ? null : await loadLearnProfile();
  const state = learnTabStateOf({ held: isSuspended(view), settingUp, profile, attempts });
  // With the viewer's attempts unread, a lesson of theirs may be in progress: no issue is read (none revealed), and the
  // list says it couldn't load.
  const listed = state.kind === 'ready' && attempts !== undefined;
  const practiced = state.kind !== 'setting-up' && state.kind !== 'no-goal';
  const [issues, practice, activity, masked] = await Promise.all([
    listed ? loadLearnIssues(LEARN_ISSUES_FIRST) : undefined,
    practiced ? loadPracticeLessons(PRACTICE_FIRST) : undefined,
    practiced ? loadContributeActivity().catch(() => null) : null,
    listed ? loadMaskedListReads() : undefined,
  ]);
  return (
    <LearnTabScreen
      state={state}
      profile={profile}
      attempts={attempts}
      counts={progress?.counts}
      issues={issues}
      practice={practice}
      activity={activity}
      agentName={lastUsedTokenOf(view?.ownAgent?.tokens)?.name ?? null}
      masked={masked}
      rulesBanner={rulesBannerOf(fairUse)}
    />
  );
}
