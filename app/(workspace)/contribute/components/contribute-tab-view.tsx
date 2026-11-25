import { type ContributeTabData, ContributeTabScreen } from './contribute-tab';
import { loadContributeTab, loadIssues } from '@/lib/contribute/contribute.data';
import { homeBoxesReadOf } from '@/lib/contribute/home-read';
import { skillsPath } from '@/lib/skills/paths';
import { withBlockedWalkthroughs } from '@/lib/workspace/blocked-walkthrough';
import {
  loadAttempts,
  loadContributeActivity,
  loadContributeSet,
  loadFairUseNotices,
  loadScheduleCounts,
} from '@/lib/workspace/contribute.data';
import { isSuspended } from '@/lib/workspace/contribute-state';
import { hasAnyAttempt } from '@/lib/workspace/getting-in';
import { loadMaskedListReads } from '@/lib/workspace/masked-issue.data';
import { WORKSPACE_PATHS } from '@/lib/workspace/paths';
import { loadBlockedWalkthroughs, loadPullRequestListWithMerged } from '@/lib/workspace/pull-request.data';
import type { PullRequestListWithMerged } from '@/lib/workspace/pull-request-page.types';

/** The list of pull requests, with the walkthroughs that wait for another pass marked when one needs the person. */
async function loadHomeList(): Promise<PullRequestListWithMerged | undefined> {
  const list = await loadPullRequestListWithMerged();
  if (!list?.rows.some((row) => row.group === 'NEEDS_YOU' && row.box === 'WALKTHROUGH')) return list;
  return { ...withBlockedWalkthroughs(list, await loadBlockedWalkthroughs()), merged: list.merged };
}

/**
 * Contribute home's reads, all at once beside the person's view (read by the page before): one that fails leaves its
 * part saying so, never something untrue.
 */
export async function ContributeTab({ view, agents }: Pick<ContributeTabData, 'view' | 'agents'>) {
  const [list, totals, attempts, page, set, activity, counts, fairUse, masked] = await Promise.all([
    loadHomeList(),
    loadContributeTab(),
    loadAttempts(undefined, 1),
    isSuspended(view) ? Promise.resolve(null) : loadIssues({}),
    loadContributeSet().catch(() => undefined),
    loadContributeActivity().catch(() => null),
    loadScheduleCounts(),
    loadFairUseNotices(),
    loadMaskedListReads(),
  ]);
  const now = new Date();
  const login = view.contributor?.login;
  const home = homeBoxesReadOf({
    view,
    list,
    totals,
    activity,
    firstDay: !hasAnyAttempt(attempts),
    skillsHref: login ? skillsPath(login) : WORKSPACE_PATHS.pullRequests,
    now,
  });
  return (
    <ContributeTabScreen
      view={view}
      agents={agents}
      home={home}
      activity={activity}
      page={page}
      set={set}
      counts={counts}
      fairUse={fairUse}
      masked={masked}
      now={now}
    />
  );
}
